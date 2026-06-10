"use client";

import { useState } from "react";
import { updateGuildAction } from "@/app/actions/guild"; // 🌟 ชี้ไปที่ไฟล์ action ในโปรเจกต์ของคุณ

interface GuildStatusFormProps {
  guild: {
    id: string;
    name: string;
    guild_url: string;
    description: string | null;
    status: string | null;
    invite_code: string | null;
    discord_link: string | null;
  };
  isAdmin: boolean;
}

export default function GuildStatusForm({ guild, isAdmin }: GuildStatusFormProps) {
  const [guildName, setGuildName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description || "");
  const [discordLink, setDiscordLink] = useState(guild.discord_link || "");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateGuildAction(guild.id, {
      name: guildName,
      description: description,
      discordLink: discordLink,
    });

    if (result.success) {
      setSuccess("อัปเดตข้อมูลกิลด์เรียบร้อยแล้ว!");
    } else {
      setError(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
    setIsLoading(false);
  };

  return (
    // 💡 ปรับพื้นหลังกล่องฟอร์มและเส้นขอบ
    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-8 transition-colors">
      <div className="flex items-center justify-between mb-4">
        {/* 💡 ปรับสีหัวข้อ */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ข้อมูลกิลด์ของคุณ</h1>
        
        {/* 💡 ปรับสีป้ายสถานะ (Badge) */}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          guild.status === "active" || guild.status === "approved" 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
            : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
        }`}>
          {guild.status === "active" || guild.status === "approved" ? "พร้อมใช้งาน" : guild.status}
        </span>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {isAdmin ? "🔒 โหมดหัวหน้ากิลด์: คุณสามารถแก้ไขข้อมูลกิลด์ได้" : "👥 โหมดสมาชิก: ดูรายละเอียดข้อมูลกิลด์ (อ่านอย่างเดียว)"}
      </p>

      {/* 💡 ปรับสีกล่องแจ้งเตือน Success / Error */}
      {success && <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 text-sm text-green-700 dark:text-green-400 text-center font-medium">{success}</div>}
      {error && <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 text-sm text-red-700 dark:text-red-400 text-center font-medium">{error}</div>}

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. ชื่อกิลด์ */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">ชื่อกิลด์</label>
          <input
            type="text"
            required
            disabled={!isAdmin || isLoading}
            value={guildName}
            onChange={(e) => setGuildName(e.target.value)}
            // 💡 ปรับสี Input ทั้งสถานะปกติและ disabled
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed font-medium"
          />
        </div>

        {/* 2. รายละเอียดกิลด์ */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">รายละเอียดกิลด์</label>
          <textarea
            rows={3}
            disabled={!isAdmin || isLoading}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            // 💡 ปรับสี Textarea
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-sm dark:placeholder-slate-400"
            placeholder="- ไม่ระบุข้อมูลรายละเอียด -"
          />
        </div>

        {/* 3. ลิงก์ Discord */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">ลิงก์ Discord ของกิลด์</label>
          <input
            type="url"
            disabled={!isAdmin || isLoading}
            value={discordLink}
            onChange={(e) => setDiscordLink(e.target.value)}
            // 💡 ปรับสี Input
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-mono dark:placeholder-slate-400"
            placeholder="https://discord.gg/xxxxxx"
          />
        </div>

        {/* 💡 ปรับเส้นคั่น */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 space-y-5">
          {/* 4. 🔒 ลิงก์หน้ากิลด์ (ล็อกตายตัวถาวร ห้ามแก้ไขทุกกรณี!) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 relative">
            <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ลิงก์หน้ากิลด์ (Guild URL) 🔒</label>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 break-all select-all font-mono">{appUrl}/g/{guild.guild_url}</p>
          </div>

          {/* 5. 🔒 รหัสเชิญกิลด์ (ล็อกตายตัวถาวร ห้ามแก้ไขทุกกรณี!) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 relative">
            <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">รหัสเชิญเข้ากิลด์ (Invite Code) 🔒</label>
            <p className="text-base font-mono text-slate-600 dark:text-slate-200 font-bold tracking-widest select-all">{guild.invite_code || "-"}</p>
          </div>
        </div>

        {/* ปุ่มบันทึกข้อมูล */}
        {isAdmin && (
          <button
            type="submit"
            disabled={isLoading}
            // 💡 ปรับสีปุ่มบันทึก (เป็นสีน้ำเงินในโหมดมืดเพื่อให้กลืนกับธีมหน้าอื่นๆ)
            className="w-full rounded-2xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-bold py-3.5 px-5 text-sm transition shadow-md cursor-pointer mt-2"
          >
            {isLoading ? "กำลังบันทึกข้อมูล..." : "💾 บันทึกการเปลี่ยนแปลงข้อมูลกิลด์"}
          </button>
        )}
      </form>
    </div>
  );
}