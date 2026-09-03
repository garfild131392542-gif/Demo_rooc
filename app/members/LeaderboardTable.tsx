"use client";

import { useState, useMemo } from "react";
import { getJobIconUrl } from "@/components/helpers";
import AttendanceManager from "@/components/AttendanceManager";
import dynamic from "next/dynamic";

const MemberExportModal = dynamic(() => import("@/components/MemberExportModal"), {
  ssr: false,
});

export type LeaderboardProfile = {
  id: string;
  display_name: string | null;
  job_name: string | null;
  cp: number | null;
  pvp_reduc: number | null;
  pvp_dmg: number | null;
  p_def: number | null;
  m_def: number | null;
  p_atk: number | null;
  m_atk: number | null;
  p_dmg: number | null;
  m_dmg: number | null;
  p_reduc: number | null;
  m_reduc: number | null;
  hp: number | null;
  sp: number | null;
  ignore_pdef: number | null;
  ignore_mdef: number | null;
  cri: number | null;
  cri_dmg: number | null;
  character_showcase_url: string | null;
  avatar_url?: string | null;
  party_id?: number | null;
  slot_index?: number | null;
  party_id_guild_league?: number | null;
  slot_index_guild_league?: number | null;
  party_id_emperium_overrun?: number | null;
  slot_index_emperium_overrun?: number | null;
  is_on_leave?: boolean | null;
};

const PodiumSlot = ({
  profile,
  rank,
  heightClass,
  colorClass,
  medalText,
  medalBg,
  glowClass = "",
}: {
  profile: any;
  rank: number;
  heightClass: string;
  colorClass: string;
  medalText: string;
  medalBg: string;
  glowClass?: string;
}) => {
  const [imgError, setImgError] = useState(false);
  const badgeSizeClass = rank === 1
    ? "w-20 h-20 sm:w-24 sm:h-24"
    : "w-16 h-16 sm:w-20 sm:h-20";

  return (
    <div className="flex flex-col items-center flex-1 max-w-[200px] sm:max-w-[240px] transition-all duration-300 hover:-translate-y-1">
      {/* Character Image container */}
      <div className="relative w-full aspect-[2/3] max-h-[200px] sm:max-h-[260px] flex items-end justify-center mb-1 group overflow-visible">
        {/* Glow Aura behind character */}
        {profile?.character_showcase_url && (
          <div className={`absolute w-32 h-32 sm:w-44 sm:h-44 rounded-full filter blur-xl opacity-75 mix-blend-screen pointer-events-none z-0 ${
            rank === 1 ? 'bg-amber-400/25 dark:bg-yellow-500/20 animate-aura-gold' :
            rank === 2 ? 'bg-slate-300/20 dark:bg-slate-400/15 animate-aura-silver' :
            'bg-orange-400/20 dark:bg-amber-600/15 animate-aura-bronze'
          }`} />
        )}

        {/* Floating Particles Sparkles */}
        {profile?.character_showcase_url && (
          <>
            <span className={`absolute text-xs animate-particle-1 left-[15%] bottom-[25%] pointer-events-none z-0 ${
              rank === 1 ? 'text-yellow-300' : rank === 2 ? 'text-blue-300' : 'text-orange-300'
            }`}>✨</span>
            <span className={`absolute text-sm animate-particle-2 right-[20%] bottom-[35%] pointer-events-none z-0 ${
              rank === 1 ? 'text-yellow-200' : rank === 2 ? 'text-indigo-200' : 'text-amber-200'
            }`}>✦</span>
            <span className={`absolute text-[10px] animate-particle-3 left-[35%] bottom-[15%] pointer-events-none z-0 ${
              rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-sky-400' : 'text-orange-400'
            }`}>★</span>
          </>
        )}

        {profile?.character_showcase_url ? (
          <img
            src={profile.character_showcase_url}
            alt={profile.display_name || ""}
            className="h-full w-auto object-contain z-10 transition-transform duration-300 group-hover:scale-105 select-none animate-game-idle"
            onError={(e) => {
              (e.target as any).src = profile.job_name ? getJobIconUrl(profile.job_name) : '/icons/jobs/default.png';
            }}
          />
        ) : (
          /* Placeholder character/silhouette with large job icon */
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/10 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-300/20 dark:border-slate-700/25 relative overflow-hidden p-4">
            {profile?.job_name ? (
              <img
                src={getJobIconUrl(profile.job_name)}
                alt={profile.job_name}
                className="w-16 h-16 sm:w-24 sm:h-24 object-contain opacity-20 dark:opacity-10 absolute pointer-events-none"
              />
            ) : (
              <span className="text-4xl opacity-10">👤</span>
            )}
            <span className="text-[10px] sm:text-xs text-slate-400/80 dark:text-slate-500/80 text-center font-medium mt-auto z-10">
              {profile ? "ยังไม่ได้อัปโหลดรูป" : "ไม่มีข้อมูล"}
            </span>
          </div>
        )}

      </div>

      {/* The 3D Podium Box */}
      <div className={`w-full ${heightClass} ${colorClass} ${glowClass} rounded-t-2xl flex flex-col items-center justify-between p-2 sm:p-3 relative border-t-4 border-l border-r border-b-0 overflow-hidden`}>
        {/* Medal Badge inside the podium stand */}
        <div className="z-10 select-none pointer-events-none my-auto flex items-center justify-center">
          {!imgError ? (
            <img
              src={`/${rank}.png`}
              alt={`Rank ${rank}`}
              className={`${badgeSizeClass} object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110`}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border border-white/20 shadow-md ${medalBg} text-white font-black text-sm`}>
              {medalText}
            </div>
          )}
        </div>

        {/* Name and class info */}
        <div className="text-center w-full z-10 space-y-0.5 sm:space-y-1 mt-auto">
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-full px-1">
            {profile ? profile.display_name : "-"}
          </p>
          <div className="flex items-center justify-center gap-1">
            {profile?.job_name && (
              <img
                src={getJobIconUrl(profile.job_name)}
                alt={profile.job_name}
                className="w-4 h-4 object-contain"
              />
            )}
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
              {profile ? profile.job_name : "ว่าง"}
            </p>
          </div>
          {profile?.cp !== undefined && profile?.cp !== null && (
            <div className="inline-flex mt-1 text-[10px] text-amber-500 dark:text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-sm select-none">
              CP: {profile.cp.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SORT_OPTIONS = [
  { label: "ค่าเริ่มต้น (เรียงตามอาชีพ)", value: "default" },
  { label: "CP", value: "cp" },
  { label: "HP", value: "hp" },
  { label: "SP", value: "sp" },
  { label: "P.ATK", value: "p_atk" },
  { label: "M.ATK", value: "m_atk" },
  { label: "P.DEF", value: "p_def" },
  { label: "M.DEF", value: "m_def" },
  { label: "P.DMG (%)", value: "p_dmg" },
  { label: "M.DMG (%)", value: "m_dmg" },
  { label: "Ignore P.DEF", value: "ignore_pdef" },
  { label: "Ignore M.DEF", value: "ignore_mdef" },
  { label: "P.Reduc (%)", value: "p_reduc" },
  { label: "M.Reduc (%)", value: "m_reduc" },
  { label: "PvP DMG", value: "pvp_dmg" },
  { label: "PvP Reduc", value: "pvp_reduc" },
  { label: "Cri", value: "cri" },
  { label: "Cri Dam (%)", value: "cri_dmg" },
];

export default function LeaderboardTable({
  profiles,
  hallOfFameGold,
  hallOfFameSilver,
  hallOfFameBronze,
  isAdmin = false,
  guildId = "",
  guildName = "ROOC Guild",
}: {
  profiles: LeaderboardProfile[];
  hallOfFameGold: string | null;
  hallOfFameSilver: string | null;
  hallOfFameBronze: string | null;
  isAdmin?: boolean;
  guildId?: string;
  guildName?: string;
}) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "attendance">("leaderboard");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table" | "comparison">("table");
  const [selectedJob, setSelectedJob] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("default");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showExportModal, setShowExportModal] = useState(false);

  // Derive activity from partyFilter
  const activity = useMemo<"general" | "guild_league" | "emperium_overrun">(() => {
    if (partyFilter.startsWith("guild_league")) return "guild_league";
    if (partyFilter.startsWith("emperium_overrun")) return "emperium_overrun";
    return "general";
  }, [partyFilter]);

  const JOB_OPTIONS = [
    "Lord Knight",
    "Paladin",
    "Biochemist",
    "Mastersmith",
    "Bard",
    "Gypsy",
    "Sniper",
    "Champion",
    "Priest",
    "Assassin",
    "Rogue",
    "Wizard",
    "Sage",
    "Summoner",
    "Rebellion",
  ];

  const JOB_ORDER: Record<string, number> = {
    knight: 1,
    "lord knight": 1,
    paladin: 2,
    biochemist: 3,
    mastersmith: 4,
    whitesmith: 4,
    bard: 5,
    gypsy: 6,
    sniper: 7,
    champion: 8,
    priest: 9,
    assassin: 10,
    assaain: 10,
    rogue: 11,
    rough: 11,
    wizard: 12,
    sage: 13,
    summoner: 14,
    rebellion: 15,
  };

  // 🌟 Map party_id and slot_index based on selected activity
  const mappedProfiles = useMemo(() => {
    return profiles.map((p) => {
      let activePartyId = p.party_id;
      let activeSlotIndex = p.slot_index;

      if (activity === "guild_league") {
        activePartyId = p.party_id_guild_league ?? null;
        activeSlotIndex = p.slot_index_guild_league ?? null;
      } else if (activity === "emperium_overrun") {
        activePartyId = p.party_id_emperium_overrun ?? null;
        activeSlotIndex = p.slot_index_emperium_overrun ?? null;
      }

      return {
        ...p,
        party_id: activePartyId,
        slot_index: activeSlotIndex,
      };
    });
  }, [profiles, activity]);

  const sortedProfiles = [...mappedProfiles].sort((a, b) => {
    if (sortBy === "default") {
      const jobA = (a.job_name || "").toLowerCase();
      const jobB = (b.job_name || "").toLowerCase();
      const orderA = JOB_ORDER[jobA] || 99;
      const orderB = JOB_ORDER[jobB] || 99;

      if (orderA !== orderB) return orderA - orderB;
      return (b.pvp_dmg || 0) - (a.pvp_dmg || 0);
    } else {
      const valA = (a as any)[sortBy] || 0;
      const valB = (b as any)[sortBy] || 0;
      return sortOrder === "desc" ? valB - valA : valA - valB;
    }
  });

  const filteredProfiles =
    selectedJob === "All"
      ? sortedProfiles
      : sortedProfiles.filter(
        (p) => (p.job_name || "").toLowerCase() === selectedJob.toLowerCase(),
      );

  // กรองตามแผนปาร์ตี้
  const roomFilteredProfiles = useMemo(() => {
    return filteredProfiles.filter((p) => {
      if (partyFilter === "all") return true;
      return p.party_id && p.party_id >= 1 && p.party_id <= 16;
    });
  }, [filteredProfiles, partyFilter]);

  // แยกเป็นทีมหลักและทีมรอง
  const mainProfiles = useMemo(() => {
    return filteredProfiles.filter((p) => p.party_id && p.party_id >= 1 && p.party_id <= 8);
  }, [filteredProfiles]);

  const subProfiles = useMemo(() => {
    return filteredProfiles.filter((p) => p.party_id && p.party_id >= 9 && p.party_id <= 16);
  }, [filteredProfiles]);

  // จัดกลุ่มตามอาชีพสำหรับห้องหลัก (ปาร์ตี้ 1-8)
  const comparisonMainByJob = useMemo(() => {
    const map: Record<string, LeaderboardProfile[]> = {};
    mainProfiles.forEach((p) => {
      const job = p.job_name || "ไม่ระบุอาชีพ";
      if (!map[job]) map[job] = [];
      map[job].push(p);
    });

    const sortedJobKeys = Object.keys(map).sort((a, b) => {
      const orderA = JOB_ORDER[a.toLowerCase()] || 99;
      const orderB = JOB_ORDER[b.toLowerCase()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return sortedJobKeys.map((job) => ({
      jobName: job,
      members: map[job],
    }));
  }, [mainProfiles]);

  // จัดกลุ่มตามอาชีพสำหรับห้องรอง (ปาร์ตี้ 9-16)
  const comparisonSubByJob = useMemo(() => {
    const map: Record<string, LeaderboardProfile[]> = {};
    subProfiles.forEach((p) => {
      const job = p.job_name || "ไม่ระบุอาชีพ";
      if (!map[job]) map[job] = [];
      map[job].push(p);
    });

    const sortedJobKeys = Object.keys(map).sort((a, b) => {
      const orderA = JOB_ORDER[a.toLowerCase()] || 99;
      const orderB = JOB_ORDER[b.toLowerCase()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return sortedJobKeys.map((job) => ({
      jobName: job,
      members: map[job],
    }));
  }, [subProfiles]);

  const getRoomBadge = (partyId: number | null | undefined) => {
    if (partyFilter === "all") return null;
    if (partyId && partyId >= 1 && partyId <= 8) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
          🛡️ ห้องหลัก P.{partyId}
        </span>
      );
    }
    if (partyId && partyId >= 9 && partyId <= 16) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
          ⚔️ ห้องรอง P.{partyId}
        </span>
      );
    }
    return null;
  };

  // สร้างฟังก์ชันตกแต่งอันดับ Top 3 แบบคลีนๆ
  const renderRank = (index: number) => {
    if (index === 0)
      return (
        <span className="text-yellow-500 font-black tracking-tighter">#1</span>
      );
    if (index === 1)
      return (
        <span className="text-slate-400 font-bold tracking-tighter">#2</span>
      );
    if (index === 2)
      return (
        <span className="text-amber-700 dark:text-amber-600 font-bold tracking-tighter">
          #3
        </span>
      );
    return (
      <span className="text-slate-400 dark:text-slate-500 font-medium">
        #{index + 1}
      </span>
    );
  };

  // ไฮไลท์คอลัมน์ที่เลือกแบบจางๆ
  const getHighlightClass = (colName: string) => {
    return sortBy === colName
      ? "bg-slate-50/80 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 font-bold"
      : "";
  };

  // Render function for table row
  const renderTableRow = (profile: LeaderboardProfile, index: number) => (
    <tr
      key={profile.id}
      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
    >
      {/* แสดงอันดับ */}
      <td className="px-6 py-3 whitespace-nowrap">
        {renderRank(index)}
      </td>

      {/* ชื่อตัวละคร */}
      <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
        {profile.display_name}
      </td>

      {/* อาชีพ */}
      <td className="px-6 py-3 whitespace-nowrap text-center">
        {profile.job_name ? (
          <div className="flex justify-center items-center">
            <img
              src={getJobIconUrl(profile.job_name)}
              alt={profile.job_name}
              className="w-7 h-7 object-contain opacity-90 hover:opacity-100 transition-opacity"
              title={profile.job_name}
            />
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* ห้อง / ปาร์ตี้ */}
      <td className="px-6 py-3 whitespace-nowrap text-center">
        {getRoomBadge(profile.party_id) || (
          <span className="text-slate-400 font-semibold text-xs">-</span>
        )}
      </td>

      {/* CP */}
      <td
        className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] font-black text-amber-500 dark:text-amber-400 ${getHighlightClass("cp")}`}
      >
        {profile.cp ? profile.cp.toLocaleString() : 0}
      </td>

      {/* ข้อมูล Status */}
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("hp")}`}>
        {profile.hp ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("sp")}`}>
        {profile.sp ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_atk")}`}>
        {profile.p_atk ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_atk")}`}>
        {profile.m_atk ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_def")}`}>
        {profile.p_def ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_def")}`}>
        {profile.m_def ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_dmg")}`}>
        {profile.p_dmg ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_dmg")}`}>
        {profile.m_dmg ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("ignore_pdef")}`}>
        {profile.ignore_pdef ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("ignore_mdef")}`}>
        {profile.ignore_mdef ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_reduc")}`}>
        {profile.p_reduc ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_reduc")}`}>
        {profile.m_reduc ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("pvp_dmg")}`}>
        {profile.pvp_dmg ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("pvp_reduc")}`}>
        {profile.pvp_reduc ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("cri")}`}>
        {profile.cri ?? 0}
      </td>
      <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("cri_dmg")}`}>
        {profile.cri_dmg ?? 0}
      </td>
    </tr>
  );

  // Render function for card
  const renderCard = (profile: LeaderboardProfile, index: number) => {
    const jobIcon = getJobIconUrl(profile.job_name);
    const rankBadgeColor =
      index === 0 ? "bg-gradient-to-r from-yellow-500 to-amber-500 ring-2 ring-yellow-400 text-white" :
      index === 1 ? "bg-gradient-to-r from-slate-400 to-slate-505 ring-2 ring-slate-300 text-white" :
      index === 2 ? "bg-gradient-to-r from-amber-700 to-amber-800 ring-2 ring-amber-600 text-white" :
      "bg-slate-105 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60";

    return (
      <div
        key={profile.id}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden group flex flex-col h-full"
      >
        {/* Rank Decorative Line */}
        <div className={`h-1.5 w-full ${
          index === 0 ? "bg-amber-400" :
          index === 1 ? "bg-slate-400" :
          index === 2 ? "bg-amber-700" :
          "bg-slate-200 dark:bg-slate-800"
        }`} />

        {/* Rank Badge */}
        <div className={`absolute top-4 left-4 font-black text-[10px] px-2.5 py-1 rounded-full z-10 ${rankBadgeColor}`}>
          #{index + 1}
        </div>

        {/* Character Showcase / Job Silhouette */}
        <div className="relative w-full aspect-[4/3] bg-slate-50 dark:bg-slate-950/20 flex items-end justify-center overflow-hidden pt-6 shrink-0">
          {profile.character_showcase_url ? (
            <img
              src={profile.character_showcase_url}
              alt={profile.display_name || ''}
              className="h-full w-auto object-contain z-10 transition-transform duration-500 group-hover:scale-105 select-none"
              onError={(e) => {
                (e.target as any).src = jobIcon || '/icons/jobs/default.png';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              {jobIcon ? (
                <img
                  src={jobIcon}
                  alt={profile.job_name || ''}
                  className="w-14 h-14 object-contain opacity-25 dark:opacity-15 group-hover:scale-110 transition-all duration-500"
                />
              ) : (
                <span className="text-3xl opacity-10">👤</span>
              )}
            </div>
          )}
          {index === 0 && (
            <div className="absolute w-28 h-28 rounded-full filter blur-xl opacity-35 bg-amber-400/30 z-0 bottom-[-15px] pointer-events-none" />
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="text-center mb-3">
            <h3 className="font-bold text-slate-900 dark:text-white truncate text-sm sm:text-base">
              {profile.display_name}
            </h3>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {jobIcon && (
                <img
                  src={jobIcon}
                  alt={profile.job_name || ''}
                  className="w-3.5 h-3.5 object-contain"
                />
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {profile.job_name || 'ไม่ทราบสายอาชีพ'}
              </span>
            </div>

            {/* Room Badge */}
            {getRoomBadge(profile.party_id) && (
              <div className="mt-2 flex items-center justify-center">
                {getRoomBadge(profile.party_id)}
              </div>
            )}
          </div>

          {/* CP Highlight */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/10 border border-amber-500/20 rounded-xl py-1.5 px-3 flex items-center justify-between mb-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">CP</span>
            <span className="text-sm font-black font-mono text-amber-500 dark:text-amber-400">
              {profile.cp ? profile.cp.toLocaleString() : 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Find manually selected members by the admin
  const rank1 = profiles.find((p) => p.id === hallOfFameGold) || null;
  const rank2 = profiles.find((p) => p.id === hallOfFameSilver) || null;
  const rank3 = profiles.find((p) => p.id === hallOfFameBronze) || null;

  return (
    <div className="space-y-6">
      {/* 🌟 Tab Navigation: สลับระหว่าง ตารางจัดอันดับ/ประสิทธิภาพสมาชิก VS ระบบเช็คชื่อกิจกรรม & Log (ขนาดกะทัดรัด มินิมอล) */}
      <div className="flex justify-start">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-800 select-none shadow-xxs">
          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span className="text-sm">🏆</span>
            <span>ตารางจัดอันดับ & วิเคราะห์ประสิทธิภาพ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span className="text-sm">📋</span>
            <span>ระบบเช็คชื่อกิจกรรม</span>
          </button>
        </div>
      </div>

      {activeTab === "attendance" ? (
        <AttendanceManager
          profiles={mappedProfiles as any}
          isAdmin={isAdmin}
          guildId={guildId}
          guildName={guildName}
        />
      ) : (
        <>
          {/* ทำเนียบเกียรติยศ (Hall of Fame) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-6 space-y-6 glass-panel relative overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">🏆</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    ทำเนียบเกียรติยศ (Hall of Fame)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    ทำเนียบเกียรติยศ 3 อันดับแรกที่หัวหน้ากิลด์เลือกไว้เป็นเกียรติประวัติ
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/15 dark:bg-yellow-400/10 border border-yellow-400/25 px-3 py-1 text-xs font-bold text-yellow-700 dark:text-yellow-400">
                  🥇 Top Players
                </span>
              </div>
            </div>

            {/* The Podiums View */}
            <div className="flex items-end justify-center gap-4 sm:gap-12 lg:gap-20 pt-16 pb-4 max-w-4xl mx-auto border-b border-slate-100 dark:border-slate-800/60">
              {/* Rank 2 (Left) */}
              <PodiumSlot
                profile={rank2}
                rank={2}
                heightClass="h-28 sm:h-36"
                colorClass="bg-gradient-to-t from-slate-400/30 to-slate-400/5 dark:from-slate-500/30 dark:to-slate-500/5 border-slate-300/40 dark:border-slate-600/40 border-t-slate-400 dark:border-t-slate-400"
                medalText="2"
                medalBg="bg-slate-400 shadow-slate-400/40"
              />

              {/* Rank 1 (Center) */}
              <PodiumSlot
                profile={rank1}
                rank={1}
                heightClass="h-36 sm:h-48"
                colorClass="bg-gradient-to-t from-yellow-500/30 to-yellow-500/5 border-yellow-300/40 dark:border-yellow-600/40 border-t-yellow-400 dark:border-t-yellow-500"
                medalText="👑"
                medalBg="bg-gradient-to-r from-yellow-500 to-amber-500 shadow-yellow-500/40 ring-4 ring-yellow-400/20"
                glowClass="shadow-[0_-8px_25px_-5px_rgba(234,179,8,0.15)]"
              />

              {/* Rank 3 (Right) */}
              <PodiumSlot
                profile={rank3}
                rank={3}
                heightClass="h-24 sm:h-30"
                colorClass="bg-gradient-to-t from-amber-700/30 to-amber-700/5 border-amber-600/40 border-t-amber-600"
                medalText="3"
                medalBg="bg-amber-600 shadow-amber-600/40"
              />
            </div>
          </div>

          {/* --- Toolbar มินิมอล & ตัวควบคุมตัวกรอง --- */}
          <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm glass-panel w-full">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 select-none shrink-0">
                <button
                  onClick={() => setViewMode("table")}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  📋 ตาราง
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "card"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  🎴 การ์ด
                </button>
                <button
                  onClick={() => setViewMode("comparison")}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "comparison"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  ⚔️ เทียบตามอาชีพ
                </button>
              </div>

              {/* ตัวเลือกแผนปาร์ตี้ & ห้อง (Image 1 + Image 2 รวมกัน) */}
              <div className="relative">
                <select
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-xl pl-3.5 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold cursor-pointer"
                >
                  <option value="all">👥 สมาชิกทั้งหมด</option>
                  <option value="general">📂 ทั่วไป (1-16 ปาร์ตี้)</option>
                  <option value="guild_league">🏆 Guild League (40v40)</option>
                  <option value="emperium_overrun">🏰 Emperium Overrun / Custom</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* ตัวกรองอาชีพ */}
              <div className="relative">
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-xl pl-3.5 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                >
                  <option value="All">ทุกอาชีพรวมกัน</option>
                  {JOB_OPTIONS.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* ตัวจัดเรียงสเตตัส */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm rounded-xl pl-3.5 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Tools: Direction & Export Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
                disabled={sortBy === "default"}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed justify-center font-medium cursor-pointer"
              >
                {sortOrder === "desc" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    <span>มากไปน้อย</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                    <span>น้อยไปมาก</span>
                  </>
                )}
              </button>

              {/* 📸 Export เป็นรูปภาพ */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <span>📸</span>
                <span>Export รูปภาพ</span>
              </button>
            </div>
          </div>

      {viewMode === "comparison" ? (
        /* --- มุมมองเปรียบเทียบตามสายอาชีพ แยก 2 Section: ห้องหลัก VS ห้องรอง --- */
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 p-4 rounded-2xl border border-blue-200 dark:border-slate-800 text-xs text-blue-900 dark:text-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚔️</span>
              <div>
                <span className="font-extrabold text-sm">โหมดวิเคราะห์และเปรียบเทียบกำลังพลแยกตามสายอาชีพ</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                  แบ่งออกเป็น 2 Section ชัดเจน: ห้องหลัก (ปาร์ตี้ 1-8) และห้องรอง (ปาร์ตี้ 9-16) เพื่อให้จัดทัพได้ง่ายขึ้น
                </p>
              </div>
            </div>
            <span className="font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl shadow-xs text-xs border border-blue-100 dark:border-slate-700 shrink-0">
              ห้องหลัก: {mainProfiles.length} คน • ห้องรอง: {subProfiles.length} คน
            </span>
          </div>

          {/* 🌟 Section 1: ห้องหลัก (Main Room - ปาร์ตี้ 1-8) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-indigo-200 dark:border-indigo-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                    <span>ห้องหลัก (Main Team)</span>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      ปาร์ตี้ 1 - 8
                    </span>
                  </h2>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-400 mt-0.5">
                    จำนวนสมาชิก {mainProfiles.length} คน • พบ {comparisonMainByJob.length} สายอาชีพ
                  </p>
                </div>
              </div>
            </div>

            {comparisonMainByJob.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparisonMainByJob.map(({ jobName, members }) => (
                  <div
                    key={jobName}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={getJobIconUrl(jobName)}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {jobName}
                        </h3>
                      </div>
                      <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        {members.length} คน
                      </span>
                    </div>

                    {/* Members comparison table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2.5 px-3 text-center w-8 font-bold">#</th>
                            <th className="py-2.5 px-3 font-bold">ชื่อตัวละคร</th>
                            <th className="py-2.5 px-3 text-center font-bold">ปาร์ตี้</th>
                            <th className="py-2.5 px-3 text-right font-bold">CP</th>
                            <th className="py-2.5 px-3 text-right font-bold">PvP DMG</th>
                            <th className="py-2.5 px-3 text-right font-bold">PvP Reduc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {members.map((m, idx) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                {m.display_name}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  P.{m.party_id || '?'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                                {m.cp ? m.cp.toLocaleString() : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {m.pvp_dmg ? `${m.pvp_dmg}%` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {m.pvp_reduc ? `${m.pvp_reduc}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                ไม่พบสมาชิกในห้องหลัก
              </div>
            )}
          </div>

          {/* 🌟 Section 2: ห้องรอง (Sub Room - ปาร์ตี้ 9-16) */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b-2 border-purple-200 dark:border-purple-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚔️</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-purple-950 dark:text-purple-200 flex items-center gap-2">
                    <span>ห้องรอง (Sub Team)</span>
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 font-bold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                      ปาร์ตี้ 9 - 16
                    </span>
                  </h2>
                  <p className="text-xs text-purple-700/80 dark:text-purple-400 mt-0.5">
                    จำนวนสมาชิก {subProfiles.length} คน • พบ {comparisonSubByJob.length} สายอาชีพ
                  </p>
                </div>
              </div>
            </div>

            {comparisonSubByJob.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {comparisonSubByJob.map(({ jobName, members }) => (
                  <div
                    key={jobName}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="bg-purple-50/60 dark:bg-purple-950/40 px-4 py-3 border-b border-purple-100 dark:border-purple-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={getJobIconUrl(jobName)}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {jobName}
                        </h3>
                      </div>
                      <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                        {members.length} คน
                      </span>
                    </div>

                    {/* Members comparison table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <th className="py-2.5 px-3 text-center w-8 font-bold">#</th>
                            <th className="py-2.5 px-3 font-bold">ชื่อตัวละคร</th>
                            <th className="py-2.5 px-3 text-center font-bold">ปาร์ตี้</th>
                            <th className="py-2.5 px-3 text-right font-bold">CP</th>
                            <th className="py-2.5 px-3 text-right font-bold">PvP DMG</th>
                            <th className="py-2.5 px-3 text-right font-bold">PvP Reduc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {members.map((m, idx) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                {m.display_name}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  P.{m.party_id || '?'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                                {m.cp ? m.cp.toLocaleString() : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {m.pvp_dmg ? `${m.pvp_dmg}%` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                {m.pvp_reduc ? `${m.pvp_reduc}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
                ไม่พบสมาชิกในห้องรอง
              </div>
            )}
          </div>
        </div>
      ) : viewMode === "card" ? (
        partyFilter === "all" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {roomFilteredProfiles.map((profile, index) => renderCard(profile, index))}
            {roomFilteredProfiles.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-sm font-medium text-slate-400">ไม่พบข้อมูลสมาชิกในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* ทีมหลัก */}
            {mainProfiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-950 pb-2">
                  <span className="text-xl">🛡️</span>
                  <h2 className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                    ทีมหลัก (Main Team) - {mainProfiles.length} คน
                  </h2>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-200/40 dark:border-indigo-900/40">
                    ปาร์ตี้ 1 - 8
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {mainProfiles.map((profile, index) => renderCard(profile, index))}
                </div>
              </div>
            )}

            {/* ทีมรอง */}
            {subProfiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-purple-100 dark:border-purple-900 pb-2">
                  <span className="text-xl">⚔️</span>
                  <h2 className="text-base font-extrabold text-purple-900 dark:text-purple-200">
                    ทีมรอง (Sub Team) - {subProfiles.length} คน
                  </h2>
                  <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-200/40 dark:border-purple-900/40">
                    ปาร์ตี้ 9 - 16
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {subProfiles.map((profile, index) => renderCard(profile, mainProfiles.length + index))}
                </div>
              </div>
            )}

            {roomFilteredProfiles.length === 0 && (
              <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-sm font-medium text-slate-400">ไม่พบข้อมูลสมาชิกในหมวดหมู่นี้</p>
              </div>
            )}
          </div>
        )
      ) : (
        /* --- ตารางดีไซน์ใหม่ ไร้ขอบกลาง --- */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden glass-panel">
          <div className="max-h-[560px] overflow-auto scroll-smooth pb-2">
            <table className="min-w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    Rank
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    Player
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap text-center">
                    Class
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap text-center">
                    ห้อง / ปาร์ตี้
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("cp")}`}
                  >
                    CP
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("hp")}`}
                  >
                    HP
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("sp")}`}
                  >
                    SP
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("p_atk")}`}
                  >
                    P.ATK
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("m_atk")}`}
                  >
                    M.ATK
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("p_def")}`}
                  >
                    P.DEF
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("m_def")}`}
                  >
                    M.DEF
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("p_dmg")}`}
                  >
                    P.DMG(%)
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("m_dmg")}`}
                  >
                    M.DMG(%)
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("ignore_pdef")}`}
                  >
                    Ign. P.DEF
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("ignore_mdef")}`}
                  >
                    Ign. M.DEF
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("p_reduc")}`}
                  >
                    P.Reduc(%)
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("m_reduc")}`}
                  >
                    M.Reduc(%)
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("pvp_dmg")}`}
                  >
                    PvP DMG
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("pvp_reduc")}`}
                  >
                    PvP Reduc
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("cri")}`}
                  >
                    Cri
                  </th>
                  <th
                    className={`px-6 py-4 font-bold whitespace-nowrap ${getHighlightClass("cri_dmg")}`}
                  >
                    Cri Dam(%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {partyFilter === "all" ? (
                  roomFilteredProfiles.map((profile, index) => renderTableRow(profile, index))
                ) : (
                  <>
                    {/* ทีมหลัก Header */}
                    {mainProfiles.length > 0 && (
                      <>
                        <tr className="bg-indigo-50/90 dark:bg-indigo-950/60 border-y-2 border-indigo-200 dark:border-indigo-800">
                          <td colSpan={21} className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🛡️</span>
                              <span className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200">
                                ทีมหลัก (Main Team) - {mainProfiles.length} คน
                              </span>
                              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200 dark:border-indigo-800">
                                ปาร์ตี้ 1 - 8
                              </span>
                            </div>
                          </td>
                        </tr>
                        {mainProfiles.map((profile, index) => renderTableRow(profile, index))}
                      </>
                    )}

                    {/* ทีมรอง Header */}
                    {subProfiles.length > 0 && (
                      <>
                        <tr className="bg-purple-50/90 dark:bg-purple-950/60 border-y-2 border-purple-200 dark:border-purple-800">
                          <td colSpan={21} className="px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">⚔️</span>
                              <span className="font-extrabold text-sm text-purple-950 dark:text-purple-200">
                                ทีมรอง (Sub Team) - {subProfiles.length} คน
                              </span>
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-900/80 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-800">
                                ปาร์ตี้ 9 - 16
                              </span>
                            </div>
                          </td>
                        </tr>
                        {subProfiles.map((profile, index) => renderTableRow(profile, mainProfiles.length + index))}
                      </>
                    )}
                  </>
                )}

                {/* กรณีไม่มีข้อมูล */}
                {roomFilteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={21} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <svg
                          className="w-10 h-10 mb-3 stroke-current"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-sm font-medium">
                          ไม่พบข้อมูลสมาชิกในหมวดหมู่นี้
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )}

  {/* 📸 Export Image Modal */}
  {showExportModal && (
    <MemberExportModal
      profiles={profiles as any}
      guildName={guildName}
      initialActivity={activity}
      onClose={() => setShowExportModal(false)}
    />
  )}
</div>
);
}
