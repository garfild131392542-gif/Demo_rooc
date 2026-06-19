"use server";

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function extractStatsFromImage(
  base64Image: string,
  mimeType: string,
) {
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

    // 💡 สุ่มลำดับ API Key เพื่อหลีกเลี่ยงคีย์ที่พังหรือโควตาเต็ม
    const shuffledKeys = [...apiKeys].sort(() => Math.random() - 0.5);

    const prompt = `
      ดูรูปภาพหน้าจอเกม Ragnarok Origin Classic (ROOC) นี้อย่างละเอียด 
      ภารกิจของคุณคือการดึงตัวเลขสเตตัส 16 ค่าออกมาให้ถูกต้องและแม่นยำที่สุด:

      1. P.ATK (จำนวนเต็ม)
      2. M.ATK (จำนวนเต็ม)
      3. P.DEF (จำนวนเต็ม)
      4. M.DEF (จำนวนเต็ม)
      5. P.DMG Bonus (ตัวเลขทศนิยม เช่น 35.83% ให้ดึงเฉพาะ 35.83)
      6. M.DMG Bonus (ตัวเลขทศนิยม เช่น 35.83% ให้ดึงเฉพาะ 35.83)
      7. P.DMG Reduction (ตัวเลขทศนิยม เช่น 35.83% ให้ดึงเฉพาะ 35.83)
      8. M.DMG Reduction (ตัวเลขทศนิยม เช่น 35.83% ให้ดึงเฉพาะ 35.83)
      9. PVP DMG Bonus (จำนวนเต็ม)
      10. PVP DMG Reduction หรือค่าที่อยู่บรรทัดสุดท้ายอยู่ซ้ายมือของค่า PVP DMG Bonus (จำนวนเต็ม)
      11. HP (จำนวนเต็ม)
      12. SP (จำนวนเต็ม)
      13. Ignore P.DEF (จำนวนเต็ม)
      14. Ignore M.DEF (จำนวนเต็ม)
      15. Cri (จำนวนเต็ม) (ค่าอัตราคริติคอลในรูป)
      16. Cri Dam หรือ Critical DMG (ตัวเลขทศนิยม เช่น 150.2% ให้ดึงเฉพาะ 150.2)
      
      คำแนะนำในการอ่านค่าเพื่อความแม่นยำสูงสุด:
      - รูปภาพอาจถูกย่อขนาดมา แต่ตัวเลขจะยังคงคมชัด ให้เพ่งเล็งตัวเลขตรงกับชื่อแอตทริบิวต์นั้นๆ
      - ห้ามใส่เครื่องหมาย % หรือตัวอักษรใดๆ ปนในตัวเลข
      - หากสเตตัสใดหาไม่เจอหรืออ่านไม่ได้จริงๆ ให้ระบุเป็น 0 ห้ามเว้นว่าง
    `;

    const base64Data = base64Image.split(",")[1];

    let lastError: any = null;
    let text = "";
    let success = false;

    // ระบบจะลองรันโมเดลที่เสถียรที่สุดก่อน (gemini-2.5-flash) และหากไม่ได้จะใช้ gemini-flash-latest เป็นตัวสำรอง
    const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest"];

    for (const apiKey of shuffledKeys) {
      let keyFailedCritically = false;

      for (const modelName of modelsToTry) {
        if (keyFailedCritically) break;

        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                  p_atk: { type: SchemaType.INTEGER, description: "P.ATK" },
                  m_atk: { type: SchemaType.INTEGER, description: "M.ATK" },
                  p_def: { type: SchemaType.INTEGER, description: "P.DEF" },
                  m_def: { type: SchemaType.INTEGER, description: "M.DEF" },
                  p_dmg: { type: SchemaType.NUMBER, description: "P.DMG Bonus" },
                  m_dmg: { type: SchemaType.NUMBER, description: "M.DMG Bonus" },
                  p_reduc: { type: SchemaType.NUMBER, description: "P.DMG Reduction" },
                  m_reduc: { type: SchemaType.NUMBER, description: "M.DMG Reduction" },
                  pvp_dmg: { type: SchemaType.INTEGER, description: "PVP DMG Bonus" },
                  pvp_reduc: { type: SchemaType.INTEGER, description: "PVP DMG Reduction" },
                  hp: { type: SchemaType.INTEGER, description: "HP" },
                  sp: { type: SchemaType.INTEGER, description: "SP" },
                  ignore_pdef: { type: SchemaType.INTEGER, description: "Ignore P.DEF" },
                  ignore_mdef: { type: SchemaType.INTEGER, description: "Ignore M.DEF" },
                  cri: { type: SchemaType.INTEGER, description: "Cri" },
                  cri_dmg: { type: SchemaType.NUMBER, description: "Cri Dam" }
                },
                required: [
                  "p_atk", "m_atk", "p_def", "m_def", "p_dmg", "m_dmg", "p_reduc", "m_reduc",
                  "pvp_dmg", "pvp_reduc", "hp", "sp", "ignore_pdef", "ignore_mdef", "cri", "cri_dmg"
                ]
              }
            },
          });

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ]);

          text = result.response.text();
          success = true;
          break; // Exit model loop on success
        } catch (err: any) {
          console.error(`Error with key starting with ${apiKey.substring(0, 8)}... using ${modelName}:`, err.message || err);
          lastError = err;

          // Check if key is critically failed (like Forbidden 403 or Invalid API key)
          const errMsg = (err.message || "").toLowerCase();
          if (errMsg.includes("forbidden") || errMsg.includes("api key not valid") || errMsg.includes("denied access")) {
            keyFailedCritically = true; // Skip other models for this key
          }
        }
      }

      if (success) {
        break; // Exit key loop on success
      }
    }

    if (!success) {
      throw lastError || new Error("ไม่มี API Key หรือโมเดลใดทำงานได้");
    }

    // 💡 ปริ้นดูผลลัพธ์ดิบๆ จาก AI ใน Terminal ของ VS Code เผื่อเช็คเวลามีปัญหา
    console.log("Raw AI Response:", text);

    const stats = JSON.parse(text.trim());

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("AI Error:", error);
    return {
      success: false,
      error: "AI อ่านภาพไม่สำเร็จ: " + (error.message || "รูปแบบข้อมูลผิดพลาด"),
    };
  }
}
