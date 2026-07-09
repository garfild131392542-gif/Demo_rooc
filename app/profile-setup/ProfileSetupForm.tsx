"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setupProfileAction } from "@/app/actions/profile";

// รับข้อมูลเดิมที่เคยกรอกไว้มาจากหน้า page.tsx
interface ProfileSetupFormProps {
  initialProfile?: {
    display_name: string | null;
    uid_game: string | null;
    job_name: string | null;
  } | null;
}

export default function ProfileSetupForm({ initialProfile }: ProfileSetupFormProps) {
  const router = useRouter();

  // ดึงค่าเริ่มต้นมาใส่ใน State
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || "");
  const [uidGame, setUidGame] = useState(initialProfile?.uid_game || "");
  const [jobName, setJobName] = useState(initialProfile?.job_name || "");

  const [guildOption, setGuildOption] = useState<"create" | "join">("create");
  const [inviteCode, setInviteCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (guildOption === "join" && !inviteCode.trim()) {
      setError("กรุณากรอกรหัสคำเชิญเพื่อเข้าร่วมกิลด์");
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        display_name: displayName,
        uid_game: uidGame,
        job_name: jobName,
        contact_email: guildOption === "create" ? contactEmail.trim() : undefined,
        invite_code: guildOption === "join" ? inviteCode.trim() : undefined,
      };

      const result = await setupProfileAction(payload as any);

      if (!result?.success) {
        setError(result?.error || "เกิดข้อผิดพลาดในการตั้งค่าโปรไฟล์");
        setIsLoading(false);
        return;
      }

      if (guildOption === "create") {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">สร้างข้อมูลตัวละคร</h1>
        <p className="text-sm text-slate-500">กรุณากรอกข้อมูลตัวละครของคุณ และเลือกเส้นทางกิลด์</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ข้อมูลพื้นฐาน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อตัวละคร</label>
              <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="กรอกชื่อตัวละครในเกม" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input type="text" disabled value={uidGame} className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-slate-500 outline-none transition" placeholder="Username ของคุณ" />
              <p className="mt-2 text-xs text-slate-500">Username จะถูกดึงจากข้อมูลบัญชีของคุณและไม่สามารถแก้ไขได้ที่หน้านี้</p>
            </div>
            <div>
              <label htmlFor="job_name" className="block text-sm font-medium text-slate-700 mb-1">อาชีพ</label>
              <select id="job_name" name="job_name" required value={jobName} onChange={(e) => setJobName(e.target.value)} className="cursor-pointer w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="" disabled>-- กรุณาเลือกอาชีพ --</option>
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
                <option value="Rebellion">Rebellion</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">เลือกเส้นทางของคุณ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${guildOption === "create" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <input type="radio" name="guildOption" value="create" className="sr-only" checked={guildOption === "create"} onChange={() => setGuildOption("create")} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">สร้างกิลด์ใหม่</span>
                <span className="text-xs text-slate-500 mt-1">เริ่มต้นสร้างกิลด์ของคุณเองและเป็นหัวหน้ากิลด์</span>
              </div>
            </label>
            <label className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${guildOption === "join" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <input type="radio" name="guildOption" value="join" className="sr-only" checked={guildOption === "join"} onChange={() => setGuildOption("join")} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">เข้าร่วมกิลด์</span>
                <span className="text-xs text-slate-500 mt-1">ใช้รหัสคำเชิญ (Invite Code) เพื่อเข้าร่วมกิลด์ของเพื่อน</span>
              </div>
            </label>
          </div>

          

          {guildOption === "join" && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-blue-900 mb-1">รหัสคำเชิญ (Invite Code)</label>
              <input type="text" required={guildOption === "join"} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-mono text-lg uppercase" placeholder="เช่น: XJ9K2" />
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading} className="cursor-pointer w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 mt-4 shadow-md">
          {isLoading ? "กำลังบันทึกข้อมูล..." : guildOption === "create" ? "บันทึกและไปหน้าสร้างกิลด์ ➔" : "ยืนยันการเข้าร่วมกิลด์ ➔"}
        </button>
      </form>
    </div>
  );
}