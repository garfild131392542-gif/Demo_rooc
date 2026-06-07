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
      model: "gemini-3.5-flash", // แนะนำให้ใช้ flash-latest เพราะอ่านข้อมูลได้เร็วและรองรับ JSON ได้ดีมาก
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const prompt = `
      ดูรูปภาพหน้าจอเกม Ragnarok นี้ 
      ภารกิจของคุณคือการดึงตัวเลขสเตตัส 10 ค่าออกมาดังนี้:

      1. P.ATK (จำนวนเต็ม)
      2. M.ATK (จำนวนเต็ม)
      3. P.DEF (จำนวนเต็ม)
      4. M.DEF (จำนวนเต็ม)
      5. P.DMG Bonus (ตัวเลขทศนิยม ฝั่งที่มีเครื่องหมาย %)
      6. M.DMG Bonus (ตัวเลขทศนิยม ฝั่งที่มีเครื่องหมาย %)
      7. P.DMG Reduction (ตัวเลขทศนิยม ฝั่งที่มีเครื่องหมาย %)
      8. M.DMG Reduction (ตัวเลขทศนิยม ฝั่งที่มีเครื่องหมาย %)
      9. PVP DMG Bonus (จำนวนเต็ม)
      10. PVP DMG Reduction หรือค่าที่อยู่บรรทัดสุดท้ายอยู่ซ้ายมือของค่า PVP DMG Bonus (จำนวนเต็ม)
      
      คำแนะนำสำคัญระดับสูง (อ่านให้ละเอียด):
      - สำหรับค่าที่ 5 ถึง 8: ให้ดึงเฉพาะตัวเลขฝั่งที่เป็นเปอร์เซ็นต์ (%) มาตอบ โดยไม่ต้องใส่เครื่องหมาย % (เช่น ในรูปคือ 35.83% ให้ตอบ 35.83)
      - สำหรับข้อ 10 (PvP DMG Reduction): เนื่องจากข้อความชื่อในเกมอาจจะยาวและเลื่อนวิ่งไปมาจนชื่อแหว่ง (เช่น เหลือแค่ 'Reduction', 'PVP DMG...' ,'P DMG Reduction' ,หรืออ่านชื่อไม่ออก) ให้คุณแก้ปัญหาโดย **หาตัวเลขจำนวนเต็มที่อยู่คู่กับ PVP DMG Bonus เสมอ** แล้วดึงค่านั้นมาตอบได้เลย
      
      ตอบกลับมาเป็น JSON ตามโครงสร้างด้านล่างนี้เท่านั้น ห้ามมีข้อความอื่นปน:
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

  } catch (error: any) {
    console.error("AI Error:", error)
    return { success: false, error: "AI อ่านภาพไม่สำเร็จ: " + (error.message || "รูปแบบข้อมูลผิดพลาด") }
  }
}