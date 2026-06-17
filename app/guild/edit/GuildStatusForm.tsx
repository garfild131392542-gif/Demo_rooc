"use client";

import { useState } from "react";
import { updateGuildAction } from "@/app/actions/guild"; // 🌟 ชี้ไปที่ไฟล์ action ในโปรเจกต์ของคุณ
import { createClient } from "@/lib/supabase/client";

interface GuildStatusFormProps {
  guild: {
    id: string;
    name: string;
    guild_url: string | null;
    description: string | null;
    status: string | null;
    invite_code: string | null;
    discord_link: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    discord_webhook_url?: string | null;
    hall_of_fame_gold_uid?: string | null;
    hall_of_fame_silver_uid?: string | null;
    hall_of_fame_bronze_uid?: string | null;
  };
  isAdmin: boolean;
  members?: { id: string; display_name: string | null; job_name: string | null }[];
}

export default function GuildStatusForm({ guild, isAdmin, members }: GuildStatusFormProps) {
  const [guildName, setGuildName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description || "");
  const [discordLink, setDiscordLink] = useState(guild.discord_link || "");
  const [logoUrl, setLogoUrl] = useState(guild.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(guild.primary_color || "#3b82f6");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(guild.discord_webhook_url || "");
  const [hallOfFameGoldUid, setHallOfFameGoldUid] = useState(guild.hall_of_fame_gold_uid || "");
  const [hallOfFameSilverUid, setHallOfFameSilverUid] = useState(guild.hall_of_fame_silver_uid || "");
  const [hallOfFameBronzeUid, setHallOfFameBronzeUid] = useState(guild.hall_of_fame_bronze_uid || "");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(guild.logo_url || "");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl("");
    setLogoPreview("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    let finalLogoUrl = logoUrl;

    if (logoFile) {
      try {
        const supabase = createClient();
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `${guild.id}/${fileName}`;

        // Upload to bucket 'guild-logos'
        const { error: uploadError } = await supabase.storage
          .from('guild-logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          throw new Error('อัปโหลดโลโก้ล้มเหลว: ' + uploadError.message);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('guild-logos')
          .getPublicUrl(filePath);

        finalLogoUrl = publicUrl;
        setLogoUrl(publicUrl);
        setLogoPreview(publicUrl);
        setLogoFile(null); // Clear selected file after success
      } catch (uploadErr: any) {
        setError(uploadErr.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        setIsLoading(false);
        return;
      }
    }

    const result = await updateGuildAction(guild.id, {
      name: guildName,
      description: description,
      discordLink: discordLink,
      logoUrl: finalLogoUrl,
      primaryColor: primaryColor,
      discordWebhookUrl: discordWebhookUrl,
      hallOfFameGoldUid: hallOfFameGoldUid || null,
      hallOfFameSilverUid: hallOfFameSilverUid || null,
      hallOfFameBronzeUid: hallOfFameBronzeUid || null,
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
    <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-8 transition-colors glass-panel">
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

      {/* 💡 แสดงโลโก้กิลด์เด่นชัดด้านบนสำหรับทุกคน */}
      {logoPreview && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shadow-inner">
          <img 
            src={logoPreview} 
            alt="Guild Logo" 
            className="h-28 w-auto object-contain rounded-xl"
            onError={(e) => { (e.target as any).src = 'https://placehold.co/200x80?text=Invalid+Logo'; }}
          />
        </div>
      )}

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
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed font-medium"
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
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-sm dark:placeholder-slate-400"
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
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-mono dark:placeholder-slate-400"
            placeholder="https://discord.gg/xxxxxx"
          />
        </div>

        {/* 4. โลโก้กิลด์ (Logo Upload) - เฉพาะแอดมินเห็น */}
        {isAdmin && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">รูปโลโก้กิลด์ (Logo Image)</label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                accept="image/*"
                disabled={isLoading}
                onChange={handleFileChange}
                className="w-full text-sm text-slate-500 dark:text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-xs file:font-semibold
                  file:bg-guild-primary file:text-white
                  hover:file:opacity-90 file:cursor-pointer"
              />
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/40"
                >
                  ลบโลโก้
                </button>
              )}
            </div>
            {logoPreview && (
              <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-center">
                <img src={logoPreview} alt="Preview" className="h-12 w-auto object-contain rounded" onError={(e) => { (e.target as any).src = 'https://placehold.co/100x100?text=Invalid+Image'; }} />
              </div>
            )}
          </div>
        )}


        {/* 6. Discord Webhook URL - เฉพาะแอดมินเห็น */}
        {isAdmin && (
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Discord Webhook URL (สำหรับแจ้งเตือนระบบ)</label>
            <input
              type="password"
              disabled={isLoading}
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-600 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-mono dark:placeholder-slate-400"
              placeholder="https://discord.com/api/webhooks/xxxxxx"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * ระบบจะใช้ส่งการแจ้งเตือนไปยังดิสคอร์ด เช่น เมื่อล้างคิว หรือแจกจ่ายไอเทม
            </p>
          </div>
        )}

        {/* 🏆 ตั้งค่าทำเนียบเกียรติยศ (Hall of Fame) - เฉพาะแอดมินเห็น */}
        {isAdmin && (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              🏆 ตั้งค่าทำเนียบเกียรติยศ (Hall of Fame)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ระบุรายชื่อผู้เล่นเพื่อขึ้นแท่นทำเนียบเกียรติยศประจำหน้าตารางจัดอันดับสมาชิก
            </p>

            <div className="space-y-3.5 pt-2">
              <div>
                <label htmlFor="gold_uid" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  🥇 อันดับที่ 1 (Gold / Center)
                </label>
                <select
                  id="gold_uid"
                  value={hallOfFameGoldUid}
                  onChange={(e) => setHallOfFameGoldUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer"
                >
                  <option value="">-- เลือกสมาชิก --</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({m.job_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="silver_uid" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  🥈 อันดับที่ 2 (Silver / Left)
                </label>
                <select
                  id="silver_uid"
                  value={hallOfFameSilverUid}
                  onChange={(e) => setHallOfFameSilverUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer"
                >
                  <option value="">-- เลือกสมาชิก --</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({m.job_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bronze_uid" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  🥉 อันดับที่ 3 (Bronze / Right)
                </label>
                <select
                  id="bronze_uid"
                  value={hallOfFameBronzeUid}
                  onChange={(e) => setHallOfFameBronzeUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer"
                >
                  <option value="">-- เลือกสมาชิก --</option>
                  {members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({m.job_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 💡 ปรับเส้นคั่น */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-5 space-y-5">
          {/* 7. 🔒 ลิงก์หน้ากิลด์ (ล็อกตายตัวถาวร ห้ามแก้ไขทุกกรณี!) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 relative">
            <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ลิงก์หน้ากิลด์ (Guild URL) 🔒</label>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 break-all select-all font-mono">{appUrl}/g/{guild.guild_url}</p>
          </div>

          {/* 8. 🔒 รหัสเชิญกิลด์ (ล็อกตายตัวถาวร ห้ามแก้ไขทุกกรณี!) */}
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
            className="w-full rounded-2xl bg-guild-primary hover:opacity-95 disabled:opacity-50 text-white font-bold py-3.5 px-5 text-sm transition shadow-md cursor-pointer mt-2 border border-white/10"
          >
            {isLoading ? "กำลังบันทึกข้อมูล..." : "💾 บันทึกการเปลี่ยนแปลงข้อมูลกิลด์"}
          </button>
        )}
      </form>
    </div>
  );
}