'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function extractStatsFromImage(base64Image: string, mimeType: string) {
  try {
    // 🌟 แก้ไข 1: เช็คก่อนว่ามีเครื่องหมาย ',' ไหม ป้องกันการหั่นสตริงพัง
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // ==========================================
    // STEP 1: ใช้ Google Cloud Vision API ดึงข้อความ
    // ==========================================
    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY; 
    
    if (!visionApiKey) {
      throw new Error("ไม่พบ GOOGLE_CLOUD_VISION_API_KEY ในไฟล์ .env");
    }

    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Data },
          // 🌟 แก้ไข 2: เปลี่ยนเป็น DOCUMENT_TEXT_DETECTION เหมาะกับ UI เกมที่ตัวหนังสือแน่นๆ
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }] 
        }]
      })
    });

    const visionData = await visionResponse.json();
    
    if (visionData.error) {
       console.error("Vision API Error:", visionData.error);
       throw new Error(`Google Vision API Error: ${visionData.error.message}`);
    }

    if (!visionData.responses?.[0]?.textAnnotations) {
       throw new Error("ระบบ OCR ไม่พบตัวหนังสือในภาพเลย");
    }

    // ได้ข้อความดิบๆ ออกมาทั้งหมดจากภาพ
    const rawTextFromImage = visionData.responses[0].textAnnotations[0].description;
    console.log("✅ [Step 1] Vision API อ่านข้อความสำเร็จ:", rawTextFromImage.substring(0, 50) + "...");

    // ==========================================
    // STEP 2: ให้ Gemini จับคู่และจัด JSON
    // ==========================================
    const apiKeys = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      throw new Error("ไม่พบ GEMINI_API_KEY ในไฟล์ .env");
    }

    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const genAI = new GoogleGenerativeAI(randomKey);
    
    // 🌟 แก้ไข 3: เปลี่ยนโมเดลเป็น gemini-1.5-flash หรือ gemini-2.0-flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      Analyze the following raw text extracted from a Ragnarok screenshot via OCR.
      Extract the requested numeric stats.
      Answer only with valid JSON and nothing else.
      
      Raw Text Data:
      """
      ${rawTextFromImage}
      """

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
      - For item 10, if the label is truncated, use the integer value associated with PVP DMG Bonus.
      - Do not output any text, labels, markdown, or extra fields.
      - Only return a single JSON object.

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
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("✅ [Step 2] Gemini จัดรูปแบบสำเร็จ");
    
    // JSON.parse ตัว response ที่ได้มา
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const stats = JSON.parse(cleanedText);

    return { success: true, data: stats };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Extraction Error:", message);
    return { success: false, error: "อ่านข้อมูลไม่สำเร็จ: " + message };
  }
}