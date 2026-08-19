import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

export interface ModerationResult {
  allowed: boolean
  reason?: string
}

/**
 * Validates file size, MIME type, and checks for NSFW/inappropriate image content using Google Gemini.
 */
export async function validateAndModerateImage(
  buffer: Buffer,
  mimeType: string,
  fileSize: number,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): Promise<ModerationResult> {
  // 1. ตรวจสอบขนาดไฟล์ ป้องกัน Memory exhaustion DoS
  if (fileSize > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0)
    return {
      allowed: false,
      reason: `ขนาดไฟล์ (${(fileSize / (1024 * 1024)).toFixed(1)}MB) เกินกำหนดสูงสุด ${maxMb}MB`,
    }
  }

  // 2. ตรวจสอบประเภทไฟล์
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    return {
      allowed: false,
      reason: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น',
    }
  }

  // 3. ตรวจสอบเนื้อหาภาพด้วย Gemini AI (Content Moderation)
  try {
    const apiKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
    ].filter(Boolean) as string[]

    if (apiKeys.length === 0) {
      console.warn('[Image Moderation] No GEMINI_API_KEY found, skipping AI moderation check.')
      return { allowed: true }
    }

    const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5)
    const base64Data = buffer.toString('base64')

    const prompt = `
      คุณคือระบบตรวจสอบความปลอดภัยของรูปภาพ (Automated Image Content Safety Moderator).
      กรุณาตรวจสอบว่ารูปภาพนี้มีเนื้อหาที่ไม่เหมาะสม ละเมิดศีลธรรม หรือผิดกฎความปลอดภัยต่อไปนี้หรือไม่:
      
      1. ภาพโป๊เปลือย อวัยวะเพศ ชุดชั้นในวาบหวิว กิจกรรมทางเพศ หรือลามกอนาจาร (Nudity / Sexual Content / Pornography)
      2. ความรุนแรง เลือด การทำร้ายร่างกาย หรือภาพสยดสยอง (Graphic Violence / Gore)
      3. สัญลักษณ์ความเกลียดชัง การเหยียดเชื้อชาติ/ศาสนา หรือสิ่งที่ผิดกฎหมายร้ายแรง (Hate Symbols / Illegal Activity)
      
      หมายเหตุ:
      - ภาพตัวละครในเกม ภาพการ์ตูน/อนิเมะที่ไม่โป๊เปลือย หรือภาพสกรีนช็อตเกม ถือว่า "is_safe: true"
      - หากพบภาพเปลือย โป๊ หรือกิจกรรมทางเพศชัดเจน ให้ระบุ "is_safe: false" พร้อมระบุเหตุผลสั้นๆ เป็นภาษาไทย
    `

    let lastError: any = null
    let resultJson: { is_safe: boolean; reason?: string } | null = null

    for (const apiKey of shuffledKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                is_safe: { type: SchemaType.BOOLEAN, description: 'True if image is safe and ethical, False if unsafe/NSFW' },
                reason: { type: SchemaType.STRING, description: 'Reason in Thai why image was flagged, or empty if safe' },
              },
              required: ['is_safe'],
            },
          },
        })

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ])

        const text = result.response.text().trim()
        resultJson = JSON.parse(text)
        break // Succeeded
      } catch (err: any) {
        console.error(`[Moderation] Error with key ${apiKey.substring(0, 8)}...:`, err.message || err)
        lastError = err
      }
    }

    if (!resultJson) {
      console.warn('[Image Moderation] Could not run moderation AI, allowing upload as fallback. Error:', lastError?.message)
      return { allowed: true }
    }

    if (!resultJson.is_safe) {
      return {
        allowed: false,
        reason: resultJson.reason || 'รูปภาพไม่เหมาะสม ขัดต่อศีลธรรม หรือมีเนื้อหาโป๊เปลือย',
      }
    }

    return { allowed: true }
  } catch (error: any) {
    console.error('[Image Moderation] Unexpected check error:', error)
    return { allowed: true } // Graceful fallback
  }
}
