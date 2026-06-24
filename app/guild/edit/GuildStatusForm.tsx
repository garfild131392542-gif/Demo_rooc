"use client";

import { useState } from "react";
import { updateGuildAction } from "@/app/actions/guild";
import { createClient } from "@/lib/supabase/client";
import { getJobIconUrl } from "@/components/helpers";

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
    hall_of_fame_gold_uid?: string | null;
    hall_of_fame_silver_uid?: string | null;
    hall_of_fame_bronze_uid?: string | null;
    discord_class_channel_id?: string | null;
    discord_name_channel_id?: string | null;
    discord_reserve_channel_id?: string | null;
    discord_leave_channel_id?: string | null;
  };
  isAdmin: boolean;
  members?: { id: string; display_name: string | null; job_name: string | null; character_showcase_url?: string | null }[];
}

export default function GuildStatusForm({ guild, isAdmin, members }: GuildStatusFormProps) {
  // State for form edits (Admins)
  const [guildName, setGuildName] = useState(guild.name);
  const [description, setDescription] = useState(guild.description || "");
  const [discordLink, setDiscordLink] = useState(guild.discord_link || "");
  const [logoUrl, setLogoUrl] = useState(guild.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(guild.primary_color || "#3b82f6");
  const [hallOfFameGoldUid, setHallOfFameGoldUid] = useState(guild.hall_of_fame_gold_uid || "");
  const [hallOfFameSilverUid, setHallOfFameSilverUid] = useState(guild.hall_of_fame_silver_uid || "");
  const [hallOfFameBronzeUid, setHallOfFameBronzeUid] = useState(guild.hall_of_fame_bronze_uid || "");
  const [discordClassChannelId, setDiscordClassChannelId] = useState(guild.discord_class_channel_id || "");
  const [discordNameChannelId, setDiscordNameChannelId] = useState(guild.discord_name_channel_id || "");
  const [discordReserveChannelId, setDiscordReserveChannelId] = useState(guild.discord_reserve_channel_id || "");
  const [discordLeaveChannelId, setDiscordLeaveChannelId] = useState(guild.discord_leave_channel_id || "");

  // File Upload State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(guild.logo_url || "");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [removeBgAutomatic, setRemoveBgAutomatic] = useState(true);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Tab State for Admin panel
  const [activeTab, setActiveTab] = useState<"general" | "discord" | "hof" | "invite">("general");

  // Copy State
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const finalGuildUrl = `${appUrl}/g/${guild.guild_url}`;

  // Helper copy handlers
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(finalGuildUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(guild.invite_code || "");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("❌ อนุญาตเฉพาะไฟล์ภาพนามสกุล png, jpg, jpeg, และ webp เท่านั้น");
        return;
      }
      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        setError("❌ ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
        return;
      }

      setError(null);
      setSuccess(null);
      setIsProcessingBg(true);

      try {
        let fileToUpload = file;
        if (removeBgAutomatic) {
          try {
            const { removeBackground } = await import("@imgly/background-removal");
            const resultBlob = await removeBackground(file);
            fileToUpload = new File([resultBlob], "logo_image.png", { type: "image/png" });
          } catch (bgError: any) {
            console.error("Failed to remove background:", bgError);
            setError("⚠️ ไม่สามารถลบพื้นหลังด้วย AI ได้ ระบบจะใช้รูปภาพแบบปกติแทนครับ");
            fileToUpload = file;
          }
        }
        setLogoFile(fileToUpload);
        setLogoPreview(URL.createObjectURL(fileToUpload));
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
      } finally {
        setIsProcessingBg(false);
      }
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

        const { error: uploadError } = await supabase.storage
          .from('guild-logos')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) {
          throw new Error('อัปโหลดโลโก้ล้มเหลว: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('guild-logos')
          .getPublicUrl(filePath);

        finalLogoUrl = publicUrl;
        setLogoUrl(publicUrl);
        setLogoPreview(publicUrl);
        setLogoFile(null);
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
      hallOfFameGoldUid: hallOfFameGoldUid || null,
      hallOfFameSilverUid: hallOfFameSilverUid || null,
      hallOfFameBronzeUid: hallOfFameBronzeUid || null,
      discordClassChannelId: discordClassChannelId || null,
      discordNameChannelId: discordNameChannelId || null,
      discordReserveChannelId: discordReserveChannelId || null,
      discordLeaveChannelId: discordLeaveChannelId || null,
    });

    if (result.success) {
      setSuccess("💾 อัปเดตข้อมูลกิลด์เรียบร้อยแล้ว!");
    } else {
      setError(result.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
    setIsLoading(false);
  };

  // Find Hall of Fame profiles from members list
  const goldProfile = members?.find((m) => m.id === guild.hall_of_fame_gold_uid) || null;
  const silverProfile = members?.find((m) => m.id === guild.hall_of_fame_silver_uid) || null;
  const bronzeProfile = members?.find((m) => m.id === guild.hall_of_fame_bronze_uid) || null;

  // --- 👥 MEMBER VIEW LAYOUT ---
  if (!isAdmin) {
    return (
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 px-2 select-none animate-in fade-in duration-300">
        
        {/* Left Column: Guild Profile Card */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl border border-white/10 dark:border-slate-800 transition-all">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 px-3 py-1 rounded-full">
                ข้อมูลกิลด์
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                กิลด์เปิดใช้งาน
              </span>
            </div>

            {/* Logo and Name */}
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner flex items-center justify-center h-32 w-48 relative overflow-hidden group">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Guild Logo" 
                    className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as any).src = 'https://placehold.co/200x80?text=No+Logo'; }}
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-400">No Guild Logo</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{guildName}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">ID: {guild.id.substring(0, 8)}...</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white/40 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center">
              <p className="text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed italic">
                "{description || "ไม่มีคำอธิบายรายละเอียดกิลด์"}"
              </p>
            </div>

            {/* Discord Connection */}
            <div>
              <h3 className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest mb-2.5">ช่องทาง Discord ของกิลด์</h3>
              {discordLink ? (
                <a 
                  href={discordLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 transition-all text-white font-bold text-sm rounded-2xl shadow-md shadow-[#5865F2]/20"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.83,42.06-2.57,75.48,8.23,95.63a105.89,105.89,0,0,0,32.22,16.29,78.29,78.29,0,0,0,6.79-11,68.6,68.6,0,0,1-10.7-5.12c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,76,0c.85.71,1.75,1.39,2.65,2a68.6,68.6,0,0,1-10.7,5.12,78.29,78.29,0,0,0,6.79,11,105.89,105.89,0,0,0,32.22-16.29C130.66,75.48,131.72,42.06,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.88,46,53.88,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.12,46,96.12,53,91,65.69,84.69,65.69Z"/>
                  </svg>
                  เข้าร่วม Discord ของกิลด์
                </a>
              ) : (
                <div className="w-full text-center py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-650 dark:text-slate-400 font-bold text-xs">
                  ยังไม่ได้เชื่อมโยงลิงก์ Discord
                </div>
              )}
            </div>
          </div>

          {/* Invite details */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-6 space-y-3.5">
            <div>
              <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest">ลิงก์แนะนำสมาชิกกิลด์</span>
              <div className="flex gap-2 mt-1">
                <input 
                  type="text" 
                  readOnly 
                  value={finalGuildUrl}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-650 dark:text-slate-350 outline-none"
                />
                <button 
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {copiedUrl ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest">รหัสเชิญเข้ากิลด์ (Invite Code)</span>
              <div className="flex gap-2 mt-1">
                <input 
                  type="text" 
                  readOnly 
                  value={guild.invite_code || "-"}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-650 dark:text-slate-350 outline-none tracking-widest font-bold"
                />
                <button 
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {copiedCode ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Hall of Fame Podium */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl border border-white/10 dark:border-slate-800">
          <div className="text-center md:text-left mb-6">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/10 px-3 py-1 rounded-full">
              เกียรติยศกิลด์
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">🏆 ทำเนียบเกียรติยศ (Hall of Fame)</h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
              ทำเนียบผู้เล่นระดับสุดยอดของกิลด์ที่จัดอันดับโดยหัวหน้ากิลด์
            </p>
          </div>

          {/* 3D Podium Layout */}
          <div className="flex items-end justify-center gap-3 sm:gap-6 pt-10 pb-4 h-full min-h-[300px]">
            
            {/* Rank 2: Silver (Left) */}
            <div className="flex flex-col items-center flex-1 max-w-[160px] sm:max-w-[200px] transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-full aspect-[2/3] max-h-[160px] sm:max-h-[220px] flex items-end justify-center mb-1 group overflow-visible">
                {silverProfile?.character_showcase_url && (
                  <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full filter blur-xl opacity-70 mix-blend-screen pointer-events-none z-0 bg-slate-300/20 dark:bg-slate-400/15 animate-aura-silver" />
                )}
                {silverProfile?.character_showcase_url ? (
                  <img
                    src={silverProfile.character_showcase_url}
                    alt={silverProfile.display_name || ""}
                    className="h-full w-auto object-contain z-10 select-none animate-game-idle"
                    onError={(e) => { (e.target as any).src = silverProfile.job_name ? getJobIconUrl(silverProfile.job_name) : ''; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/10 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-300/20 dark:border-slate-700/20 p-2">
                    {silverProfile?.job_name ? (
                      <img src={getJobIconUrl(silverProfile.job_name)} className="w-10 h-10 object-contain opacity-20" alt="Job" />
                    ) : (
                      <span className="text-xl opacity-10">👤</span>
                    )}
                    <span className="text-[9px] text-slate-500 mt-2 font-semibold">ยังไม่มีข้อมูล</span>
                  </div>
                )}
              </div>
              <div className="w-full h-20 sm:h-24 bg-gradient-to-b from-slate-200/50 to-slate-400/30 dark:from-slate-700/50 dark:to-slate-800/30 rounded-t-2xl flex flex-col items-center justify-between p-2 relative border-t-4 border-slate-300 dark:border-slate-500 overflow-hidden shadow-md">
                <img src="/2.png" alt="Silver" className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                <div className="text-center w-full z-10 mt-auto">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-white truncate px-1">
                    {silverProfile ? silverProfile.display_name : "-"}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 truncate font-semibold">
                    {silverProfile ? silverProfile.job_name : "ว่าง"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rank 1: Gold (Center) - Taller */}
            <div className="flex flex-col items-center flex-1 max-w-[180px] sm:max-w-[220px] transition-all duration-300 hover:-translate-y-1 z-10">
              <div className="relative w-full aspect-[2/3] max-h-[200px] sm:max-h-[260px] flex items-end justify-center mb-1 group overflow-visible">
                {goldProfile?.character_showcase_url && (
                  <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full filter blur-xl opacity-80 mix-blend-screen pointer-events-none z-0 bg-amber-400/25 dark:bg-yellow-500/20 animate-aura-gold" />
                )}
                {goldProfile?.character_showcase_url ? (
                  <img
                    src={goldProfile.character_showcase_url}
                    alt={goldProfile.display_name || ""}
                    className="h-full w-auto object-contain z-10 select-none animate-game-idle"
                    onError={(e) => { (e.target as any).src = goldProfile.job_name ? getJobIconUrl(goldProfile.job_name) : ''; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/10 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-300/20 dark:border-slate-700/20 p-2">
                    {goldProfile?.job_name ? (
                      <img src={getJobIconUrl(goldProfile.job_name)} className="w-12 h-12 object-contain opacity-20" alt="Job" />
                    ) : (
                      <span className="text-2xl opacity-10">👤</span>
                    )}
                    <span className="text-[9px] text-slate-500 mt-2 font-semibold">ยังไม่มีข้อมูล</span>
                  </div>
                )}
              </div>
              <div className="w-full h-28 sm:h-32 bg-gradient-to-b from-yellow-100/50 to-amber-300/30 dark:from-yellow-900/30 dark:to-yellow-950/20 rounded-t-2xl flex flex-col items-center justify-between p-2 relative border-t-4 border-yellow-500 dark:border-yellow-600 overflow-hidden shadow-lg">
                <img src="/1.png" alt="Gold" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]" />
                <div className="text-center w-full z-10 mt-auto">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate px-1">
                    {goldProfile ? goldProfile.display_name : "-"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 truncate font-bold">
                    {goldProfile ? goldProfile.job_name : "ว่าง"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rank 3: Bronze (Right) */}
            <div className="flex flex-col items-center flex-1 max-w-[160px] sm:max-w-[200px] transition-all duration-300 hover:-translate-y-1">
              <div className="relative w-full aspect-[2/3] max-h-[160px] sm:max-h-[220px] flex items-end justify-center mb-1 group overflow-visible">
                {bronzeProfile?.character_showcase_url && (
                  <div className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full filter blur-xl opacity-70 mix-blend-screen pointer-events-none z-0 bg-orange-400/20 dark:bg-amber-600/15 animate-aura-bronze" />
                )}
                {bronzeProfile?.character_showcase_url ? (
                  <img
                    src={bronzeProfile.character_showcase_url}
                    alt={bronzeProfile.display_name || ""}
                    className="h-full w-auto object-contain z-10 select-none animate-game-idle"
                    onError={(e) => { (e.target as any).src = bronzeProfile.job_name ? getJobIconUrl(bronzeProfile.job_name) : ''; }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/10 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-300/20 dark:border-slate-700/20 p-2">
                    {bronzeProfile?.job_name ? (
                      <img src={getJobIconUrl(bronzeProfile.job_name)} className="w-10 h-10 object-contain opacity-20" alt="Job" />
                    ) : (
                      <span className="text-xl opacity-10">👤</span>
                    )}
                    <span className="text-[9px] text-slate-500 mt-2 font-semibold">ยังไม่มีข้อมูล</span>
                  </div>
                )}
              </div>
              <div className="w-full h-18 sm:h-20 bg-gradient-to-b from-amber-200/40 to-orange-400/20 dark:from-amber-800/30 dark:to-orange-950/20 rounded-t-2xl flex flex-col items-center justify-between p-2 relative border-t-4 border-amber-600 dark:border-amber-700 overflow-hidden shadow-md">
                <img src="/3.png" alt="Bronze" className="w-10 h-10 sm:w-14 sm:h-14 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                <div className="text-center w-full z-10 mt-auto">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-white truncate px-1">
                    {bronzeProfile ? bronzeProfile.display_name : "-"}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-700 dark:text-slate-300 truncate font-semibold">
                    {bronzeProfile ? bronzeProfile.job_name : "ว่าง"}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  }

  // --- 🔒 ADMIN VIEW LAYOUT (TABBED PANEL) ---
  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-6 sm:p-8 transition-all glass-panel animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700 pb-5 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            ข้อมูลกิลด์ของคุณ
          </h1>
          <p className="text-xs text-slate-850 dark:text-slate-300 mt-1 font-semibold">
            🔒 โหมดหัวหน้ากิลด์: คุณสามารถตั้งค่าและอัปเดตข้อมูลทั้งหมดของกิลด์ได้จากหน้านี้
          </p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 self-start sm:self-center">
          พร้อมใช้งาน
        </span>
      </div>

      {/* Save Status Messages */}
      {success && <div className="mb-5 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 text-xs sm:text-sm text-green-700 dark:text-green-400 text-center font-bold">{success}</div>}
      {error && <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 text-xs sm:text-sm text-red-700 dark:text-red-400 text-center font-bold">{error}</div>}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-250/20 dark:hover:bg-slate-800/50"
          }`}
        >
          📝 ข้อมูลกิลด์
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("discord")}
          className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "discord"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-250/20 dark:hover:bg-slate-800/50"
          }`}
        >
          🤖 ตั้งค่าบอท
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hof")}
          className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "hof"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-250/20 dark:hover:bg-slate-800/50"
          }`}
        >
          🏆 เกียรติยศ
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invite")}
          className={`flex-1 text-center py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "invite"
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-700"
              : "text-slate-700 dark:text-slate-350 hover:bg-slate-250/20 dark:hover:bg-slate-800/50"
          }`}
        >
          🔒 ลิงก์/รหัสเชิญ
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* TAB 1: GENERAL SETTINGS */}
        {activeTab === "general" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Logo Preview box */}
            {logoPreview && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center relative overflow-hidden group max-w-[200px] mx-auto shadow-inner">
                <img 
                  src={logoPreview} 
                  alt="Guild Logo Preview" 
                  className="h-20 w-auto object-contain rounded"
                  onError={(e) => { (e.target as any).src = 'https://placehold.co/200x80?text=No+Logo'; }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">ชื่อกิลด์</label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:opacity-50 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">รายละเอียดกิลด์</label>
              <textarea
                rows={3}
                disabled={isLoading}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:opacity-50 text-sm font-medium dark:placeholder-slate-550"
                placeholder="- ยังไม่มีการกำหนดคำอธิบาย -"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">ลิงก์ Discord ของกิลด์</label>
              <input
                type="url"
                disabled={isLoading}
                value={discordLink}
                onChange={(e) => setDiscordLink(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-4 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 disabled:opacity-50 text-sm font-mono dark:placeholder-slate-550"
                placeholder="https://discord.gg/xxxxxx"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">อัปโหลดรูปโลโก้กิลด์ (Logo Image)</label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  disabled={isLoading || isProcessingBg}
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-550 dark:text-slate-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-xl file:border-0
                    file:text-xs file:font-bold
                    file:bg-blue-600 file:text-white
                    hover:file:opacity-90 file:cursor-pointer disabled:opacity-50"
                />
                {logoPreview && (
                  <button
                    type="button"
                    disabled={isLoading || isProcessingBg}
                    onClick={handleRemoveLogo}
                    className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-500/10 dark:bg-red-950/20 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/30 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    ลบโลโก้
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remove_bg_toggle"
                  type="checkbox"
                  checked={removeBgAutomatic}
                  onChange={(e) => setRemoveBgAutomatic(e.target.checked)}
                  disabled={isLoading || isProcessingBg}
                  className="h-4 w-4 rounded border-slate-350 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 cursor-pointer"
                />
                <label htmlFor="remove_bg_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                  🔮 ลบพื้นหลังอัตโนมัติด้วย AI
                </label>
              </div>

              {isProcessingBg && (
                <p className="text-[11px] text-blue-500 font-bold animate-pulse">
                  🔮 AI กำลังประมวลผลลบพื้นหลัง (ดาวน์โหลดโมเดลในครั้งแรก 10-15 วินาที)...
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DISCORD BOT CONFIG */}
        {activeTab === "discord" && (
          <div className="space-y-4 animate-in fade-in duration-200">

            {/* Bot Invite Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#5865F2]/40 bg-gradient-to-br from-[#5865F2]/10 via-[#5865F2]/5 to-transparent dark:from-[#5865F2]/20 dark:via-[#5865F2]/10 dark:to-transparent p-5 shadow-md">
              <div className="flex items-start gap-4">
                {/* Discord Bot Icon */}
                <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-[#5865F2] shadow-lg shadow-[#5865F2]/30">
                  <svg className="w-7 h-7 fill-white" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.83,42.06-2.57,75.48,8.23,95.63a105.89,105.89,0,0,0,32.22,16.29,78.29,78.29,0,0,0,6.79-11,68.6,68.6,0,0,1-10.7-5.12c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,76,0c.85.71,1.75,1.39,2.65,2a68.6,68.6,0,0,1-10.7,5.12,78.29,78.29,0,0,0,6.79,11,105.89,105.89,0,0,0,32.22-16.29C130.66,75.48,131.72,42.06,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.88,46,53.88,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.12,46,96.12,53,91,65.69,84.69,65.69Z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-0.5">
                    เชิญบอทเข้าเซิร์ฟเวอร์ Discord
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-3">
                    บอทต้องอยู่ในเซิร์ฟเวอร์ก่อน จึงจะสามารถส่งแจ้งเตือนไปยังห้องด้านล่างได้
                  </p>
                  <a
                    href="https://discord.com/oauth2/authorize?client_id=1517039373097369610&permissions=134220800&integration_type=0&scope=bot+applications.commands"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#5865F2]/25 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 127.14 96.36">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.83,42.06-2.57,75.48,8.23,95.63a105.89,105.89,0,0,0,32.22,16.29,78.29,78.29,0,0,0,6.79-11,68.6,68.6,0,0,1-10.7-5.12c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,76,0c.85.71,1.75,1.39,2.65,2a68.6,68.6,0,0,1-10.7,5.12,78.29,78.29,0,0,0,6.79,11,105.89,105.89,0,0,0,32.22-16.29C130.66,75.48,131.72,42.06,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.88,46,53.88,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.12,46,96.12,53,91,65.69,84.69,65.69Z"/>
                    </svg>
                    เชิญบอทเข้าเซิร์ฟเวอร์
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Channel Config Card */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                🤖 เชื่อมต่อห้องบอท Discord (Discord Bot Channels)
              </h3>
              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-semibold leading-relaxed">
                ระบุหมายเลขไอดีห้องดิสคอร์ด (Channel ID 18 หลัก) เพื่อให้ระบบส่งบอทแจ้งเตือนอัตโนมัติ
              </p>
            </div>

            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label htmlFor="bot_class_channel" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  ห้องแจ้งเปลี่ยนอาชีพ (Class Channel ID)
                </label>
                <input
                  id="bot_class_channel"
                  type="text"
                  disabled={isLoading}
                  value={discordClassChannelId}
                  onChange={(e) => setDiscordClassChannelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm font-mono"
                  placeholder="เช่น 1517392982754594966"
                />
              </div>

              <div>
                <label htmlFor="bot_name_channel" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  ห้องแจ้งเปลี่ยนชื่อ (Name Channel ID)
                </label>
                <input
                  id="bot_name_channel"
                  type="text"
                  disabled={isLoading}
                  value={discordNameChannelId}
                  onChange={(e) => setDiscordNameChannelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm font-mono"
                  placeholder="เช่น 1517393029554765955"
                />
              </div>

              <div>
                <label htmlFor="bot_reserve_channel" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  ห้องคิวจองประมูลไอเทม (Reserve Channel ID)
                </label>
                <input
                  id="bot_reserve_channel"
                  type="text"
                  disabled={isLoading}
                  value={discordReserveChannelId}
                  onChange={(e) => setDiscordReserveChannelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm font-mono"
                  placeholder="เช่น 1617393064400912494"
                />
              </div>

              <div>
                <label htmlFor="bot_leave_channel" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  ห้องแจ้งลากิจกรรม (Leave Channel ID)
                </label>
                <input
                  id="bot_leave_channel"
                  type="text"
                  disabled={isLoading}
                  value={discordLeaveChannelId}
                  onChange={(e) => setDiscordLeaveChannelId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm font-mono"
                  placeholder="เช่น 1717393064400912494"
                />
              </div>
            </div>
            </div>
          </div>
        )}

        {/* TAB 3: HALL OF FAME SELECTORS */}
        {activeTab === "hof" && (
          <div className="space-y-4 animate-in fade-in duration-200 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-200 mb-1">
                🏆 ทำเนียบเกียรติยศ (Hall of Fame Setup)
              </h3>
              <p className="text-[11px] text-slate-800 dark:text-slate-300 font-semibold leading-relaxed">
                เลือกสมาชิกกิลด์ขึ้นแสดงแท่นเกียรติยศสูงสุด 3 ลำดับแรกประจำตารางจัดอันดับความแกร่ง
              </p>
            </div>

            <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label htmlFor="hof_gold" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  🥇 อันดับที่ 1 (Gold / Center Podium)
                </label>
                <select
                  id="hof_gold"
                  value={hallOfFameGoldUid}
                  onChange={(e) => setHallOfFameGoldUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer font-semibold"
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
                <label htmlFor="hof_silver" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  🥈 อันดับที่ 2 (Silver / Left Podium)
                </label>
                <select
                  id="hof_silver"
                  value={hallOfFameSilverUid}
                  onChange={(e) => setHallOfFameSilverUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer font-semibold"
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
                <label htmlFor="hof_bronze" className="block text-xs font-bold text-slate-850 dark:text-slate-200 mb-1.5">
                  🥉 อันดับที่ 3 (Bronze / Right Podium)
                </label>
                <select
                  id="hof_bronze"
                  value={hallOfFameBronzeUid}
                  onChange={(e) => setHallOfFameBronzeUid(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-900 dark:text-white outline-none transition focus:border-guild-primary focus:ring-2 focus:ring-guild-primary/20 text-sm cursor-pointer font-semibold"
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

        {/* TAB 4: INVITE & URLS */}
        {activeTab === "invite" && (
          <div className="space-y-4 animate-in fade-in duration-200">

            {/* Bot Invite Banner */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#5865F2]/30 bg-gradient-to-r from-[#5865F2]/10 to-[#5865F2]/5 dark:from-[#5865F2]/20 dark:to-[#5865F2]/10 px-4 py-3.5">
              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-[#5865F2] shadow-md shadow-[#5865F2]/30">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C-3.83,42.06-2.57,75.48,8.23,95.63a105.89,105.89,0,0,0,32.22,16.29,78.29,78.29,0,0,0,6.79-11,68.6,68.6,0,0,1-10.7-5.12c.9-.66,1.8-1.34,2.65-2a75.58,75.58,0,0,0,76,0c.85.71,1.75,1.39,2.65,2a68.6,68.6,0,0,1-10.7,5.12,78.29,78.29,0,0,0,6.79,11,105.89,105.89,0,0,0,32.22-16.29C130.66,75.48,131.72,42.06,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.88,46,53.88,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.12,46,96.12,53,91,65.69,84.69,65.69Z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">เชิญบอทเข้าเซิร์ฟเวอร์ Discord</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">บอทต้องอยู่ในเซิร์ฟเวอร์ก่อน จึงจะส่งแจ้งเตือนได้</p>
              </div>
              <a
                href="https://discord.com/oauth2/authorize?client_id=1517039373097369610&permissions=134220800&integration_type=0&scope=bot+applications.commands"
                target="_blank"
                rel="noreferrer noopener"
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#5865F2]/20"
              >
                เชิญบอท
                <svg className="w-3 h-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 relative shadow-inner">
              <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">ลิงก์หน้ากิลด์ (Guild URL) 🔒</label>
              <div className="flex gap-2 mt-2">
                <p className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200 break-all select-all font-mono py-2">{finalGuildUrl}</p>
                <button 
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer self-center"
                >
                  {copiedUrl ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 relative shadow-inner">
              <div className="absolute top-4 right-4 text-slate-400 dark:text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">รหัสเชิญเข้ากิลด์ (Invite Code) 🔒</label>
              <div className="flex gap-2 mt-2">
                <p className="flex-1 text-lg font-mono text-slate-900 dark:text-white font-black tracking-widest select-all py-1">{guild.invite_code || "-"}</p>
                <button 
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer self-center"
                >
                  {copiedCode ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button at bottom */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
          <button
            type="submit"
            disabled={isLoading || isProcessingBg}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:from-slate-200 dark:disabled:from-slate-800 text-white font-extrabold py-4 px-6 text-sm transition-all shadow-md hover:shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังบันทึกข้อมูลกิลด์...
              </>
            ) : isProcessingBg ? (
              "🔮 AI กำลังลบพื้นหลังรูปภาพ..."
            ) : (
              "💾 บันทึกการเปลี่ยนแปลงข้อมูลกิลด์"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}