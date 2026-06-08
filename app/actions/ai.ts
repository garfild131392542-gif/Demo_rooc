'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function extractStatsFromImage(base64Image: string, mimeType: string) {
  try {
    const apiKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      throw new Error("API Key ไม่ได้ตั้งค่าไว้");
    }

    // 💡 สุ่มเลือกคีย์มา 1 ตัวจาก Array
    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const genAI = new GoogleGenerativeAI(randomKey);
    
    // 💡 เพิ่ม generationConfig เพื่อบังคับให้ AI ตอบกลับมาเป็น JSON 100% ไม่มีข้อความอื่นปน
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // แนะนำให้ใช้ flash-latest เพราะอ่านข้อมูลได้เร็วและรองรับ JSON ได้ดีมาก
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const prompt = `
      Analyze this Ragnarok screenshot and extract the requested numeric stats.
      Answer only with valid JSON and nothing else.
      Use the exact object structure shown below.

      1. p_atk: integer
      2. m_atk: integer
      3. p_def: integer
      4. m_def: integer
      5. p_dmg: decimal percentage without the % sign
      6. m_dmg: decimal percentage without the % sign
      7. p_reduc: decimal percentage without the % sign
      8. m_reduc: decimal percentage without the % sign
      9. pvp_dmg: integer
      10. pvp_reduc: integer (the integer paired with PVP DMG Bonus)

      Important:
      - For items 5-8, return only the numeric percentage value, no % symbol.
      - For item 10, if the label is truncated or partially visible, use the integer value associated with PVP DMG Bonus.
      - Do not output any text, labels, markdown, or extra fields.
      - Only return a single JSON object.

      ดูรูปภาพหน้าจอเกม Ragnarok นี้
      ดึงค่า stat จากภาพให้ครบ 10 ค่าตามโครงสร้างด้านล่าง
      ตอบเฉพาะ JSON เท่านั้น ห้ามมีข้อความอื่นปน

      {
        "p_atk": 0,
        "m_atk": 0,
        "p_def": 0,
        "m_def": 0,
        "p_dmg": 0.0,
        "m_dmg": 0.0,
        "p_reduc": 0.0,
        "m_reduc": 0.0,
        "pvp_dmg": 0,
        "pvp_reduc": 0
      }
    `

    const base64Data = base64Image.split(',')[1]

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ])

    const text = result.response.text()
    
    // 💡 ปริ้นดูผลลัพธ์ดิบๆ จาก AI ใน Terminal ของ VS Code เผื่อเช็คเวลามีปัญหา
    console.log("Raw AI Response:", text)
    
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

    // ข้อมูลจะเป็น JSON แน่นอน จึงแปลงได้เลย
    const stats = JSON.parse(cleanedText)

    return { success: true, data: stats }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("AI Error:", error)
    return { success: false, error: "AI อ่านภาพไม่สำเร็จ: " + (message || "รูปแบบข้อมูลผิดพลาด") }
  }
}