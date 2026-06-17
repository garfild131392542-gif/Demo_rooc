"use client";

import { useState } from "react";
import { getJobIconUrl } from "@/components/helpers";

type LeaderboardProfile = {
  id: string;
  display_name: string | null;
  job_name: string | null;
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

        </div>
      </div>
    </div>
  );
};

const SORT_OPTIONS = [
  { label: "ค่าเริ่มต้น (เรียงตามอาชีพ)", value: "default" },
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
}: {
  profiles: LeaderboardProfile[];
  hallOfFameGold: string | null;
  hallOfFameSilver: string | null;
  hallOfFameBronze: string | null;
}) {
  const [selectedJob, setSelectedJob] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("default");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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
  };

  const sortedProfiles = [...profiles].sort((a, b) => {
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

  // Find manually selected members by the admin
  const rank1 = profiles.find((p) => p.id === hallOfFameGold) || null;
  const rank2 = profiles.find((p) => p.id === hallOfFameSilver) || null;
  const rank3 = profiles.find((p) => p.id === hallOfFameBronze) || null;

  return (
    <div className="space-y-6">
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

      {/* --- Toolbar มินิมอล --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm glass-panel">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* ตัวกรองอาชีพแบบเรียบๆ */}
          <div className="relative">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
            >
              <option value="All">ทุกอาชีพรวมกัน</option>
              {JOB_OPTIONS.map((job) => (
                <option key={job} value={job}>
                  {job}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>

          {/* ตัวจัดเรียงสเตตัสแบบเรียบๆ */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </div>
          </div>
        </div>

        {/* ปุ่มสลับ ทิศทางแบบ Icon Only */}
        <button
          onClick={() =>
            setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
          }
          disabled={sortBy === "default"}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center font-medium"
        >
          {sortOrder === "desc" ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                ></path>
              </svg>{" "}
              มากไปน้อย
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                ></path>
              </svg>{" "}
              น้อยไปมาก
            </>
          )}
        </button>
      </div>

      {/* --- ตารางดีไซน์ใหม่ ไร้ขอบกลาง --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden glass-panel">
        <div className="max-h-[500px] overflow-auto scroll-smooth pb-2">
          <table className="min-w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">
                  Rank
                </th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">
                  Player
                </th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-center">
                  Class
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("hp")}`}
                >
                  HP
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("sp")}`}
                >
                  SP
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("p_atk")}`}
                >
                  P.ATK
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("m_atk")}`}
                >
                  M.ATK
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("p_def")}`}
                >
                  P.DEF
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("m_def")}`}
                >
                  M.DEF
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("p_dmg")}`}
                >
                  P.DMG(%)
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("m_dmg")}`}
                >
                  M.DMG(%)
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("ignore_pdef")}`}
                >
                  Ign. P.DEF
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("ignore_mdef")}`}
                >
                  Ign. M.DEF
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("p_reduc")}`}
                >
                  P.Reduc(%)
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("m_reduc")}`}
                >
                  M.Reduc(%)
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("pvp_dmg")}`}
                >
                  PvP DMG
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("pvp_reduc")}`}
                >
                  PvP Reduc
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("cri")}`}
                >
                  Cri
                </th>
                <th
                  className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass("cri_dmg")}`}
                >
                  Cri Dam(%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredProfiles.map((profile, index) => (
                <tr
                  key={profile.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* แสดงอันดับ */}
                  <td className="px-6 py-3 whitespace-nowrap">
                    {renderRank(index)}
                  </td>

                  {/* ชื่อตัวละคร */}
                  <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
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

                  {/* ข้อมูล Status (ใช้ font-mono เพื่อให้ตัวเลขตรงกันเหมือนตาราง Data) */}
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("hp")}`}
                  >
                    {profile.hp ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("sp")}`}
                  >
                    {profile.sp ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_atk")}`}
                  >
                    {profile.p_atk ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_atk")}`}
                  >
                    {profile.m_atk ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_def")}`}
                  >
                    {profile.p_def ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_def")}`}
                  >
                    {profile.m_def ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_dmg")}`}
                  >
                    {profile.p_dmg ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_dmg")}`}
                  >
                    {profile.m_dmg ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("ignore_pdef")}`}
                  >
                    {profile.ignore_pdef ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("ignore_mdef")}`}
                  >
                    {profile.ignore_mdef ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("p_reduc")}`}
                  >
                    {profile.p_reduc ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("m_reduc")}`}
                  >
                    {profile.m_reduc ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("pvp_dmg")}`}
                  >
                    {profile.pvp_dmg ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("pvp_reduc")}`}
                  >
                    {profile.pvp_reduc ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("cri")}`}
                  >
                    {profile.cri ?? 0}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass("cri_dmg")}`}
                  >
                    {profile.cri_dmg ?? 0}
                  </td>


                </tr>
              ))}

              {/* กรณีไม่มีข้อมูล */}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={19} className="px-6 py-16 text-center">
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
                        ไม่พบข้อมูลสมาชิกในอาชีพนี้
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
