"use client";

import { useState, useTransition, useRef } from "react";
import { updateMyProfile } from "@/app/actions/profile";
import { extractStatsFromImage } from "@/app/actions/ai"; // 💡 ดึง Action ของ AI มาใช้
import { Profile } from "@/components/Dashboard";

export default function ProfileForm({
  initialProfile,
}: {
  initialProfile: Profile;
}) {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 สร้าง State สำหรับตัวเลขสเตตัส เพื่อให้ AI เอาค่ามาหยอดใส่ได้
  const [stats, setStats] = useState({
    p_atk: initialProfile.p_atk ?? 0,
    m_atk: initialProfile.m_atk ?? 0,
    p_def: initialProfile.p_def ?? 0,
    m_def: initialProfile.m_def ?? 0,
    pvp_dmg: initialProfile.pvp_dmg ?? 0,
    pvp_reduc: initialProfile.pvp_reduc ?? 0,
    p_dmg: initialProfile.p_dmg ?? 0,
    m_dmg: initialProfile.m_dmg ?? 0,
    p_reduc: initialProfile.p_reduc ?? 0,
    m_reduc: initialProfile.m_reduc ?? 0,
  });

  // ฟังก์ชันอัปเดต State เมื่อพิมพ์กรอกเองแบบปกติ
  const handleStatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStats((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  // ฟังก์ชันอัปโหลดและส่งให้ AI (รองรับ 2 รูป)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // จำกัดให้เลือกได้สูงสุด 2 รูป
    const filesToProcess = files.slice(0, 2);

    setMessage(null);
    setIsAiLoading(true);

    try {
      // แปลงไฟล์เป็น Base64 ทั้งหมด
      const base64Images = await Promise.all(
        filesToProcess.map(
          (file) =>
            new Promise<{ base64: string; type: string }>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                resolve({
                  base64: reader.result as string,
                  type: file.type,
                });
              };
            })
        )
      );

      // ส่งให้ AI ช่วยอ่านทั้ง 2 รูป
      const results = await Promise.all(
        base64Images.map((img) => extractStatsFromImage(img.base64, img.type))
      );

      // ตรวจสอบว่าผลลัพธ์สำเร็จหรือไม่
      const successResults = results.filter((r) => r.success && r.data);

      if (successResults.length > 0) {
        const mergedData = successResults[0].data;

        // ถ้ามี 2 รูป ใช้ค่าจากรูปที่ 1 ถ้าไม่มีค่าให้ลองรูปที่ 2
        if (successResults.length === 2 && successResults[1].data) {
          const data2 = successResults[1].data;
          
          // ฟังก์ชันเลือกค่า: ใช้ตัวแรก ถ้าไม่มีให้ใช้ตัวที่ 2
          const selectValue = (val1: number | undefined, val2: number | undefined) => {
            return (val1 !== undefined && val1 !== 0) ? val1 : (val2 || 0);
          };

          mergedData.p_atk = selectValue(mergedData.p_atk, data2.p_atk);
          mergedData.m_atk = selectValue(mergedData.m_atk, data2.m_atk);
          mergedData.p_def = selectValue(mergedData.p_def, data2.p_def);
          mergedData.m_def = selectValue(mergedData.m_def, data2.m_def);
          mergedData.p_dmg = selectValue(mergedData.p_dmg, data2.p_dmg);
          mergedData.m_dmg = selectValue(mergedData.m_dmg, data2.m_dmg);
          mergedData.p_reduc = selectValue(mergedData.p_reduc, data2.p_reduc);
          mergedData.m_reduc = selectValue(mergedData.m_reduc, data2.m_reduc);
          mergedData.pvp_dmg = selectValue(mergedData.pvp_dmg, data2.pvp_dmg);
          mergedData.pvp_reduc = selectValue(mergedData.pvp_reduc, data2.pvp_reduc);
        }

        setStats({
          p_atk: mergedData.p_atk || stats.p_atk,
          m_atk: mergedData.m_atk || stats.m_atk,
          p_def: mergedData.p_def || stats.p_def,
          m_def: mergedData.m_def || stats.m_def,
          p_dmg: mergedData.p_dmg || stats.p_dmg,
          m_dmg: mergedData.m_dmg || stats.m_dmg,
          p_reduc: mergedData.p_reduc || stats.p_reduc,
          m_reduc: mergedData.m_reduc || stats.m_reduc,
          pvp_dmg: mergedData.pvp_dmg || stats.pvp_dmg,
          pvp_reduc: mergedData.pvp_reduc || stats.pvp_reduc,
        });

        const imageCount = filesToProcess.length;
        setMessage({
          type: "success",
          text:
            imageCount === 2
              ? "🤖 AI อ่านสเตตัสจากทั้ง 2 รูปเรียบร้อยแล้ว! กรุณาตรวจสอบและกดบันทึก!"
              : "🤖 AI อ่านสเตตัสเรียบร้อยแล้ว กรุณาตรวจสอบและกดบันทึก!",
        });
      } else {
        // 💡 แปลง Error ดิบๆ ให้เป็นข้อความที่ผู้ใช้งานทั่วไปอ่านแล้วสบายใจ (Good UX)
        let userFriendlyMessage = "🤔 AI มองเห็นตัวเลขไม่ชัดเจน รบกวนแคปรูปใหม่ให้เห็นสเตตัสครบถ้วน แล้วลองอีกครั้งนะครับ";

        // ดักจับ Error ที่พบบ่อยจากการเรียกใช้ API
        const errorMessage = results[0]?.error || "";
        if (errorMessage.includes("503")) {
          userFriendlyMessage = "⏳ ตอนนี้มีผู้ใช้งาน AI พร้อมกันจำนวนมาก รบกวนรอสัก 1 นาทีแล้วกดอัปโหลดใหม่นะครับ";
        } else if (errorMessage.includes("429") || errorMessage.includes("Quota")) {
          userFriendlyMessage = "🛑 โควต้า AI สำหรับวันนี้เต็มแล้วครับ รบกวนกรอกตัวเลขด้วยตัวเองไปก่อนนะครับ";
        } else if (errorMessage.includes("404")) {
          userFriendlyMessage = "🔧 ระบบ AI กำลังปิดปรับปรุงชั่วคราว รบกวนกรอกข้อมูลด้วยตัวเองไปก่อนนะครับ";
        }

        setMessage({
          type: "error",
          text: userFriendlyMessage,
        });
      }

      setIsAiLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // ล้างค่าปุ่มอัปโหลด
    } catch {
      // 💡 ปรับข้อความ Catch Error ให้ดูซอฟต์ลง
      setMessage({
        type: "error",
        text: "⚠️ เกิดข้อผิดพลาดในการโหลดไฟล์รูปภาพ รบกวนตรวจสอบไฟล์แล้วลองใหม่อีกครั้งครับ",
      });
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateMyProfile(formData);
      if (result.success) {
        setMessage({ type: "success", text: "อัปเดตข้อมูลสำเร็จ!" });
      } else {
        setMessage({
          type: "error",
          text: result.error || "ไม่สามารถอัปเดตข้อมูลได้",
        });
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6"
    >
      {message && (
        <div
          className={`p-4 rounded-md font-medium text-sm ${message.type === "success" ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800" : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"}`}
        >
          {message.text}
        </div>
      )}

      {/* 💡 ส่วนอัปโหลดรูปให้ AI */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            ✨ Auto Fill ด้วย AI (Beta)
          </h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
            อัปโหลดรูปสเตตัส 1-2 รูปในเกม เพื่อให้ระบบ AI อ่านแล้วกรอกตัวเลขให้อัตโนมัติ
          </p>
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAiLoading || isPending}
            className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {isAiLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>{" "}
                กำลังอ่าน...
              </>
            ) : (
              "อัปโหลดรูปสเตตัส"
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            UID (Game) - อ่านได้อย่างเดียว
          </label>
          <input
            type="text"
            value={initialProfile.uid_game}
            disabled
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-900 dark:border-gray-600 dark:text-gray-400"
          />
        </div>
        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            ชื่อตัวละคร (Display Name)
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={initialProfile.display_name}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="job_name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          อาชีพ (Job Name)
        </label>
        <select
          id="job_name"
          name="job_name"
          defaultValue={initialProfile.job_name || ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="" disabled>
            -- กรุณาเลือกอาชีพ --
          </option>
          <option value="Lord Knight">Lord Knight</option>
          <option value="Paladin">Paladin</option>
          <option value="Biochemist">Biochemist</option>
          <option value="Mastersmith">Mastersmith</option>
          <option value="Bard">Bard</option>
          <option value="Gypsy">Gypsy</option>
          <option value="Sniper">Sniper</option>
          <option value="Champion">Champion</option>
          <option value="Priest">Priest</option>
          <option value="Assassin">Assassin</option>
          <option value="Rogue">Rogue</option>
          <option value="Wizard">Wizard</option>
          <option value="Sage">Sage</option>
          <option value="Summoner">Summoner</option>
        </select>
      </div>

      {/* 💡 อัปเดตช่องสเตตัสให้เชื่อมกับตัวแปร stats ที่ผูกกับ AI */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
        <div>
          <label
            htmlFor="p_atk"
            className="block text-sm font-medium text-red-600 dark:text-red-400"
          >
            P.ATK
          </label>
          <input
            id="p_atk"
            name="p_atk"
            type="number"
            min="0"
            value={stats.p_atk}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
        <div>
          <label
            htmlFor="m_atk"
            className="block text-sm font-medium text-orange-600 dark:text-orange-400"
          >
            M.ATK
          </label>
          <input
            id="m_atk"
            name="m_atk"
            type="number"
            min="0"
            value={stats.m_atk}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="p_def"
            className="block text-sm font-medium text-blue-600 dark:text-blue-400"
          >
            P.DEF
          </label>
          <input
            id="p_def"
            name="p_def"
            type="number"
            min="0"
            value={stats.p_def}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
        <div>
          <label
            htmlFor="m_def"
            className="block text-sm font-medium text-purple-600 dark:text-purple-400"
          >
            M.DEF
          </label>
          <input
            id="m_def"
            name="m_def"
            type="number"
            min="0"
            value={stats.m_def}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="p_dmg"
            className="block text-sm font-medium text-red-700 dark:text-red-500"
          >
            P.DMG(%)
          </label>
          <input
            id="p_dmg"
            name="p_dmg"
            type="number"
            step="0.01"
            min="0"
            value={stats.p_dmg}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
        <div>
          <label
            htmlFor="m_dmg"
            className="block text-sm font-medium text-orange-700 dark:text-orange-500"
          >
            M.DMG(%)
          </label>
          <input
            id="m_dmg"
            name="m_dmg"
            type="number"
            step="0.01"
            min="0"
            value={stats.m_dmg}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="p_reduc"
            className="block text-sm font-medium text-blue-700 dark:text-blue-500"
          >
            P.Reduc(%)
          </label>
          <input
            id="p_reduc"
            name="p_reduc"
            type="number"
            step="0.01"
            min="0"
            value={stats.p_reduc}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
        <div>
          <label
            htmlFor="m_reduc"
            className="block text-sm font-medium text-purple-700 dark:text-purple-500"
          >
            M.Reduc(%)
          </label>
          <input
            id="m_reduc"
            name="m_reduc"
            type="number"
            step="0.01"
            min="0"
            value={stats.m_reduc}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>

        <div>
          <label
            htmlFor="pvp_dmg"
            className="block text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            PvP DMG
          </label>
          <input
            id="pvp_dmg"
            name="pvp_dmg"
            type="number"
            min="0"
            value={stats.pvp_dmg}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
        <div>
          <label
            htmlFor="pvp_reduc"
            className="block text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            PvP Reduc
          </label>
          <input
            id="pvp_reduc"
            name="pvp_reduc"
            type="number"
            min="0"
            value={stats.pvp_reduc}
            onChange={handleStatChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isPending || isAiLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลโปรไฟล์"}
        </button>
      </div>
    </form>
  );
}
