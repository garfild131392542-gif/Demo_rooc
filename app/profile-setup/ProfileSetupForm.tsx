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
    <div className="w-full max-w-xl rounded-4xl border border-white/40 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl shadow-2xl shadow-blue-500/10 ring-1 ring-white/50 dark:ring-white/10 p-6 sm:p-10 relative overflow-hidden transition-all duration-300">
      {/* Top Glass Shimmer Glow */}
      <div className="pointer-events-none absolute -top-px left-1/4 right-1/4 h-px bg-linear-to-r from-transparent via-blue-400/60 to-transparent" />
      <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl" />

      <div className="text-center mb-8 relative">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-500 text-white text-2xl shadow-lg shadow-blue-500/30 mb-3.5 ring-4 ring-blue-500/10">
          🧙‍♂️
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          สร้างข้อมูลตัวละคร
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          กรุณากรอกข้อมูลตัวละครของคุณ และเลือกเส้นทางสู่กิลด์
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-4 text-xs sm:text-sm text-rose-700 dark:text-rose-300 text-center font-bold backdrop-blur-md animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <div className="space-y-4 bg-white/60 dark:bg-slate-800/40 p-5 sm:p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              ข้อมูลพื้นฐานตัวละคร
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ชื่อตัวละครในเกม <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 backdrop-blur-md text-sm font-medium shadow-inner"
                placeholder="เช่น ROOC_Player"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Username บัญชี
              </label>
              <input
                type="text"
                disabled
                value={uidGame}
                className="w-full rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/50 px-4 py-3 text-slate-500 dark:text-slate-400 outline-none backdrop-blur-md text-sm font-mono cursor-not-allowed"
                placeholder="Username"
              />
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                ดึงจากบัญชีของคุณโดยอัตโนมัติ
              </p>
            </div>

            <div>
              <label htmlFor="job_name" className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                อาชีพ <span className="text-rose-500">*</span>
              </label>
              <select
                id="job_name"
                name="job_name"
                required
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="cursor-pointer w-full rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 backdrop-blur-md text-sm font-medium shadow-inner"
              >
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

        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h2 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              เลือกเส้นทางกิลด์ของคุณ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label
              className={`relative flex flex-col cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all backdrop-blur-md shadow-xs ${
                guildOption === "create"
                  ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10"
                  : "border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/60"
              }`}
            >
              <input
                type="radio"
                name="guildOption"
                value="create"
                className="sr-only"
                checked={guildOption === "create"}
                onChange={() => setGuildOption("create")}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🏰</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${guildOption === "create" ? "border-blue-600 bg-blue-600" : "border-slate-300 dark:border-slate-600"}`}>
                  {guildOption === "create" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                สร้างกิลด์ใหม่
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                สร้างสังกัดของคุณเองและรับตำแหน่งหัวหน้ากิลด์
              </span>
            </label>

            <label
              className={`relative flex flex-col cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all backdrop-blur-md shadow-xs ${
                guildOption === "join"
                  ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10"
                  : "border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/60"
              }`}
            >
              <input
                type="radio"
                name="guildOption"
                value="join"
                className="sr-only"
                checked={guildOption === "join"}
                onChange={() => setGuildOption("join")}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">⚔️</span>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${guildOption === "join" ? "border-indigo-600 bg-indigo-600" : "border-slate-300 dark:border-slate-600"}`}>
                  {guildOption === "join" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                เข้าร่วมกิลด์
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                ใช้รหัสคำเชิญ (Invite Code) เพื่อเข้าร่วมกิลด์เพื่อน
              </span>
            </label>
          </div>

          {guildOption === "join" && (
            <div className="mt-3.5 p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-3xl border border-indigo-200/70 dark:border-indigo-800/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
                🔑 รหัสคำเชิญ (Invite Code)
              </label>
              <input
                type="text"
                required={guildOption === "join"}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-white/90 dark:bg-slate-900/90 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/20 font-mono text-base tracking-wider uppercase backdrop-blur-md shadow-inner"
                placeholder="เช่น: XJ9K2"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="cursor-pointer w-full rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 px-6 text-sm sm:text-base shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isLoading
            ? "กำลังบันทึกข้อมูล..."
            : guildOption === "create"
            ? "บันทึกและไปหน้าสร้างกิลด์ ➔"
            : "ยืนยันการเข้าร่วมกิลด์ ➔"}
        </button>
      </form>
    </div>
  );
}