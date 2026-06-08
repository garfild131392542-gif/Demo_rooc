'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"

export async function extractStatsFromImage(base64Image: string, mimeType: string) {
  try {
    const base64Data = base64Image.split(',')[1];

    // ==========================================
    // STEP 1: ใช้ Google Cloud Vision API ดึงข้อความ (เร็วมาก)
    // ==========================================
    const visionApiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY; 
    
    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Data },
          features: [{ type: "TEXT_DETECTION" }] // เน้นอ่าน Text อย่างเดียว
        }]
      })
    });

    const visionData = await visionResponse.json();
    
    if (!visionData.responses?.[0]?.textAnnotations) {
       throw new Error("ไม่พบตัวหนังสือในภาพ");
    }

    // ได้ข้อความดิบๆ ออกมาทั้งหมดจากภาพ
    const rawTextFromImage = visionData.responses[0].textAnnotations[0].description;

    // ==========================================
    // STEP 2: ให้ Gemini จับคู่และจัด JSON (เร็วขึ้นเพราะประมวลผลแค่ Text)
    // ==========================================
    const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean) as string[];

    const randomKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
    const genAI = new GoogleGenerativeAI(randomKey);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // ปรับ Prompt เล็กน้อย โดยนำ rawText ยัดเข้าไปแทนรูปภาพ
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

    // สังเกตว่าเราไม่ได้ส่งรูปภาพ (inlineData) ไปแล้ว ส่งแค่ prompt ที่มี Text
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("Raw AI Response:", text);
    
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const stats = JSON.parse(cleanedText);

    return { success: true, data: stats };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Extraction Error:", error);
    return { success: false, error: "อ่านข้อมูลไม่สำเร็จ: " + message };
  }
}