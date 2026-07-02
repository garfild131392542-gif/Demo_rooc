"use client";

import { useState, useTransition, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { updateProfileParty } from "@/app/actions/dashboard";
import PartyBlock from "./PartyBlock";
import WaitlistBlock from "./WaitlistBlock";
import LeaveListBlock from "./LeaveListBlock";
import MemberCard, { MemberCardOverlay } from "./MemberCard";
import ExportModal from "./ExportModal";

export type Profile = {
  id: string;
  uid_game: string;
  email?: string | null;
  display_name: string;
  job_name: string;
  cp?: number | null;

  // Stats
  pvp_reduc: number;
  pvp_dmg: number;
  p_def: number;
  m_def: number;
  p_atk: number;
  m_atk: number;
  p_dmg: number;
  m_dmg: number;
  p_reduc: number;
  m_reduc: number;
  hp: number;
  sp: number;
  ignore_pdef: number;
  ignore_mdef: number;
  cri?: number | null;
  cri_dmg?: number | null;

  // Guild & Authorization
  guild_id?: string | null;
  avatar_url: string;
  role: "admin" | "member";

  // Party & Status
  party_id: number | null;
  slot_index: number | null;
  is_on_leave: boolean;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_stat_update?: string;
};

export default function Dashboard({
  initialProfiles,
  isAdmin,
}: {
  initialProfiles: Profile[];
  isAdmin: boolean;
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<{
    partyId: number;
    slotIndex: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Guild Activity and Party Team assignment states
  const [activity, setActivity] = useState<'general' | 'guild_league' | 'emperium_overrun'>('general');
  const [partyTeams, setPartyTeams] = useState<Record<number, 'defense' | 'offense' | 'runner'>>(() => {
    const defaults: Record<number, 'defense' | 'offense' | 'runner'> = {}
    for (let i = 1; i <= 16; i++) {
      if (i <= 6) defaults[i] = 'defense';
      else if (i <= 12) defaults[i] = 'offense';
      else defaults[i] = 'runner';
    }
    return defaults;
  });

  const [defenseInput, setDefenseInput] = useState<string>('')
  const [offenseInput, setOffenseInput] = useState<string>('')

  useEffect(() => {
    const defenseCount = Object.values(partyTeams).filter(v => v === 'defense').length
    const offenseCount = Object.values(partyTeams).filter(v => v === 'offense').length
    setDefenseInput(defenseCount.toString())
    setOffenseInput(offenseCount.toString())
  }, [partyTeams])

  const handleDefenseInputChange = (val: string) => {
    setDefenseInput(val)
    if (val !== '') {
      const num = Number(val)
      if (!isNaN(num)) {
        handleResizeTeams('defense', num)
      }
    }
  }

  const handleOffenseInputChange = (val: string) => {
    setOffenseInput(val)
    if (val !== '') {
      const num = Number(val)
      if (!isNaN(num)) {
        handleResizeTeams('offense', num)
      }
    }
  }

  const handleInputBlur = (teamType: 'defense' | 'offense') => {
    const currentVal = teamType === 'defense' ? defenseInput : offenseInput;
    if (currentVal === '') {
      const count = Object.values(partyTeams).filter(v => v === teamType).length;
      if (teamType === 'defense') {
        setDefenseInput(count.toString());
      } else {
        setOffenseInput(count.toString());
      }
    }
  };

  useEffect(() => {
    const savedActivity = localStorage.getItem('rooc_active_activity');
    if (savedActivity) {
      setActivity(savedActivity as any);
    }
    const savedTeams = localStorage.getItem('rooc_party_teams');
    if (savedTeams) {
      try {
        setPartyTeams(JSON.parse(savedTeams));
      } catch (e) { }
    }
  }, []);

  const handleActivityChange = (act: 'general' | 'guild_league' | 'emperium_overrun') => {
    setActivity(act);
    localStorage.setItem('rooc_active_activity', act);
  };

  const handlePartyTeamChange = (partyId: number, team: 'defense' | 'offense' | 'runner') => {
    setPartyTeams(prev => {
      const updated = { ...prev, [partyId]: team };
      localStorage.setItem('rooc_party_teams', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResizeTeams = (teamType: 'defense' | 'offense', count: number) => {
    const safeCount = Math.max(0, Math.min(16, count));
    setPartyTeams(prev => {
      const updated = { ...prev };
      let defenseCount = teamType === 'defense' ? safeCount : Object.values(prev).filter(v => v === 'defense').length;
      let offenseCount = teamType === 'offense' ? safeCount : Object.values(prev).filter(v => v === 'offense').length;

      // Ensure sum of defense and offense doesn't exceed 16
      if (defenseCount + offenseCount > 16) {
        if (teamType === 'defense') {
          offenseCount = 16 - defenseCount;
        } else {
          defenseCount = 16 - offenseCount;
        }
      }

      // Reassign contiguously
      for (let i = 1; i <= 16; i++) {
        if (i <= defenseCount) {
          updated[i] = 'defense';
        } else if (i <= defenseCount + offenseCount) {
          updated[i] = 'offense';
        } else {
          updated[i] = 'runner';
        }
      }

      localStorage.setItem('rooc_party_teams', JSON.stringify(updated));
      return updated;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  const handleClearMember = (memberId: string) => {
    if (!isAdmin) return;

    // 1. Optimistic Update: แก้ไข State ในหน้าจอทันทีเพื่อให้ UI เปลี่ยนไวที่สุด
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === memberId ? { ...p, party_id: null, slot_index: null } : p,
      ),
    );

    // 2. Sync to DB in the background
    startTransition(() => {
      updateProfileParty(memberId, null, null);
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || !isAdmin || !isEditMode) return;

    const profileId = active.id as string;
    const overId = over.id as string;

    let targetPartyId: number | null = null;
    let targetSlotIndex: number | null = null;

    if (overId === "waitlist") {
      targetPartyId = null;
      targetSlotIndex = null;
    } else if (overId.startsWith("party-")) {
      const parts = overId.split("-");
      targetPartyId = parseInt(parts[1]);
      targetSlotIndex = parseInt(parts[3]);
    } else {
      return;
    }

    const sourceProfile = profiles.find((p) => p.id === profileId);
    if (!sourceProfile) return;

    // If dropped on the same slot, do nothing
    if (
      sourceProfile.party_id === targetPartyId &&
      sourceProfile.slot_index === targetSlotIndex
    ) {
      return;
    }

    // Find if there is an occupant in the target slot
    const occupant =
      targetPartyId !== null && targetSlotIndex !== null
        ? profiles.find(
          (p) =>
            p.party_id === targetPartyId && p.slot_index === targetSlotIndex,
        )
        : null;

    // Optimistic Update
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === profileId) {
          return { ...p, party_id: targetPartyId, slot_index: targetSlotIndex };
        }
        if (occupant && p.id === occupant.id) {
          // Push occupant to waitlist
          return { ...p, party_id: null, slot_index: null };
        }
        return p;
      }),
    );

    // Sync to server
    startTransition(() => {
      if (occupant) {
        updateProfileParty(occupant.id, null, null);
      }
      updateProfileParty(profileId, targetPartyId, targetSlotIndex);
    });
  };

  const assignMemberToSlot = (memberId: string) => {
    if (!activeSlot || !isAdmin) return;
    const { partyId: targetPartyId, slotIndex: targetSlotIndex } = activeSlot;

    const sourceProfile = profiles.find((p) => p.id === memberId);
    if (!sourceProfile) return;

    // If dropped on the same slot, do nothing
    if (
      sourceProfile.party_id === targetPartyId &&
      sourceProfile.slot_index === targetSlotIndex
    ) {
      setActiveSlot(null);
      return;
    }

    const occupant = profiles.find(
      (p) => p.party_id === targetPartyId && p.slot_index === targetSlotIndex,
    );

    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === memberId) {
          return { ...p, party_id: targetPartyId, slot_index: targetSlotIndex };
        }
        if (occupant && p.id === occupant.id) {
          return { ...p, party_id: null, slot_index: null };
        }
        return p;
      }),
    );

    startTransition(() => {
      if (occupant) {
        updateProfileParty(occupant.id, null, null);
      }
      updateProfileParty(memberId, targetPartyId, targetSlotIndex);
    });

    setActiveSlot(null);
  };

  const activeProfile = profiles.find((p) => p.id === activeId);

  // Generate Party Arrays
  const parties = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="w-full max-w-14xl mx-auto px-4 ">
        {/* Edit Mode Control Bar — Admin Only */}
        {isAdmin && (
          <div
            className="sticky top-16 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md mb-4 px-4 py-3 rounded-xl border shadow-sm flex items-center justify-between gap-3
            transition-colors duration-300
            border-gray-200 dark:border-gray-700"
          >
            {/* Mode label */}
            <div
              className={` flex items-center gap-2 text-sm font-semibold transition-colors duration-300 ${isEditMode ? "text-orange-600 dark:text-orange-400" : "text-indigo-700 dark:text-indigo-300"}`}
            >
              <span className="cursor-pointer text-base">
                {isEditMode ? "⚠️" : ""}
              </span>
              <span>
                {isEditMode
                  ? "โหมดแก้ไข - ลากแล้วปล่อยเพื่อจัดสมาชิกเข้าปาร์ตี้ หรือย้ายไป Waitlist"
                  : "แสดงปกติ"}
              </span>
            </div>

            {/* Export Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                className="cursor-pointer flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Export ตาราง
              </button>

              {/* Toggle Switch */}
              <button
                role="switch"
                aria-checked={isEditMode}
                onClick={() => setIsEditMode((prev) => !prev)}
                className={`cursor-pointer relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shrink-0
                ${isEditMode
                    ? "bg-orange-500 focus-visible:ring-orange-500"
                    : "bg-gray-300 dark:bg-gray-600 focus-visible:ring-indigo-500"
                  }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
                  ${isEditMode ? "translate-x-8" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Activity Segmented Control Selector */}
        <div className="mb-6 bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-2xl flex gap-1.5 inline-flex max-w-full overflow-x-auto self-start border border-gray-200/50 dark:border-gray-800 shadow-xxs">
          <button
            onClick={() => handleActivityChange('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activity === 'general'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            📂 ทั่วไป (1-16 ปาร์ตี้)
          </button>
          <button
            onClick={() => handleActivityChange('guild_league')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activity === 'guild_league'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400'
              }`}
          >
            🏆 Guild League (40v40)
          </button>
          <button
            onClick={() => handleActivityChange('emperium_overrun')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activity === 'emperium_overrun'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400'
              }`}
          >
            🏰 Emperium Overrun
          </button>
        </div>

        {(activity === 'emperium_overrun' || activity === 'general') && isAdmin && isEditMode && (
          <div className="mb-6 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between transition-all">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                🏰 ปรับแต่งจำนวนปาร์ตี้แต่ละทีม ({activity === 'emperium_overrun' ? 'Emperium Overrun' : 'ทั่วไป'})
              </h3>
              <p className="text-[10px] text-orange-700 dark:text-orange-400">
                ระบุจำนวนปาร์ตี้สำหรับแต่ละทีม ระบบจะคำนวณและแบ่งกลุ่มปาร์ตี้ให้อัตโนมัติ (รวมทั้งหมด 16 ปาร์ตี้)
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">กันบ้าน:</span>
                <input
                  type="number"
                  min="0"
                  max="16"
                  value={defenseInput}
                  onChange={(e) => handleDefenseInputChange(e.target.value)}
                  onBlur={() => handleInputBlur('defense')}
                  className="w-14 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-900 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-orange-550 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">ทีมบุก:</span>
                <input
                  type="number"
                  min="0"
                  max="16"
                  value={offenseInput}
                  onChange={(e) => handleOffenseInputChange(e.target.value)}
                  onBlur={() => handleInputBlur('offense')}
                  className="w-14 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-900 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-orange-550 text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">วิ่งบ้าน:</span>
                <input
                  type="number"
                  value={Object.values(partyTeams).filter(v => v === 'runner').length}
                  className="w-14 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs font-bold text-center text-gray-500 cursor-not-allowed font-mono"
                  disabled
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Waitlist & LeaveList (Top on mobile, Right on desktop) - Only visible to admin */}
          {isAdmin && (
            <div
              className=" md:block hidden w-full lg:w-80 shrink-0 flex md:flex-row gap-4 
      order-1 lg:order-2 
      lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto"
            >
              <div className="flex flex-col gap-4">

                <div>
                  <WaitlistBlock
                    profiles={profiles.filter(
                      (p) => p.party_id === null && !p.is_on_leave,
                    )}
                    isAdmin={isAdmin}
                    isEditMode={isEditMode}
                  />
                </div>
                <div>
                  <LeaveListBlock
                    profiles={profiles.filter(
                      (p) => p.party_id === null && p.is_on_leave,
                    )}
                    isEditMode={isEditMode}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Left Side: 16 Parties Grouped by Activity */}
          <div className="flex-1 w-full order-2 lg:order-1">
            {activity === 'general' && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {parties.map((partyId) => (
                  <PartyBlock
                    key={partyId}
                    partyId={partyId}
                    profiles={profiles.filter((p) => p.party_id === partyId)}
                    isAdmin={isAdmin}
                    isEditMode={isEditMode}
                    onEmptySlotClick={(partyId, slotIndex) =>
                      setActiveSlot({ partyId, slotIndex })
                    }
                    onMemberClear={handleClearMember}
                    activity={activity}
                  />
                ))}
              </div>
            )}

            {activity === 'guild_league' && (
              <div className="space-y-8">
                {/* ทีมหลัก */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-indigo-100 dark:border-indigo-950 pb-2">
                    <span className="text-xl">🛡️</span>
                    <h2 className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                      ทีมหลัก (Main Team) - 40 คน
                    </h2>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-200/40 dark:border-indigo-900/40">
                      ปาร์ตี้ 1 - 8
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {parties.filter(pid => pid <= 8).map((partyId) => (
                      <PartyBlock
                        key={partyId}
                        partyId={partyId}
                        profiles={profiles.filter((p) => p.party_id === partyId)}
                        isAdmin={isAdmin}
                        isEditMode={isEditMode}
                        onEmptySlotClick={(partyId, slotIndex) =>
                          setActiveSlot({ partyId, slotIndex })
                        }
                        onMemberClear={handleClearMember}
                        activity={activity}
                      />
                    ))}
                  </div>
                </div>

                {/* ทีมรอง */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-purple-100 dark:border-purple-900 pb-2">
                    <span className="text-xl">⚔️</span>
                    <h2 className="text-base font-extrabold text-purple-900 dark:text-purple-200">
                      ทีมรอง (Sub Team) - 40 คน
                    </h2>
                    <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-200/40 dark:border-purple-900/40">
                      ปาร์ตี้ 9 - 16
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {parties.filter(pid => pid > 8).map((partyId) => (
                      <PartyBlock
                        key={partyId}
                        partyId={partyId}
                        profiles={profiles.filter((p) => p.party_id === partyId)}
                        isAdmin={isAdmin}
                        isEditMode={isEditMode}
                        onEmptySlotClick={(partyId, slotIndex) =>
                          setActiveSlot({ partyId, slotIndex })
                        }
                        onMemberClear={handleClearMember}
                        activity={activity}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activity === 'emperium_overrun' && (
              <div className="space-y-8">
                {/* ทีมป้องกันบ้าน */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-blue-100 dark:border-blue-900 pb-2">
                    <span className="text-xl">🏰</span>
                    <h2 className="text-base font-extrabold text-blue-900 dark:text-blue-200">
                      ทีมป้องกันบ้าน (Defense Team)
                    </h2>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-200/40 dark:border-blue-900/40">
                      {parties.filter(pid => partyTeams[pid] === 'defense').length} ปาร์ตี้
                    </span>
                  </div>
                  {parties.filter(pid => partyTeams[pid] === 'defense').length === 0 ? (
                    <div className="text-center py-10 text-xs font-semibold text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                      ยังไม่มีปาร์ตี้ในทีมนี้ (เปลี่ยนทีมของปาร์ตี้ผ่านตัวเลือกขวาบนของการ์ดในโหมดแก้ไข)
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {parties.filter(pid => partyTeams[pid] === 'defense').map((partyId) => (
                        <PartyBlock
                          key={partyId}
                          partyId={partyId}
                          profiles={profiles.filter((p) => p.party_id === partyId)}
                          isAdmin={isAdmin}
                          isEditMode={isEditMode}
                          onEmptySlotClick={(partyId, slotIndex) =>
                            setActiveSlot({ partyId, slotIndex })
                          }
                          onMemberClear={handleClearMember}
                          activity={activity}
                          currentTeam={partyTeams[partyId]}
                          onTeamChange={(team) => handlePartyTeamChange(partyId, team)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ทีมบุก */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-rose-100 dark:border-rose-900 pb-2">
                    <span className="text-xl">🔥</span>
                    <h2 className="text-base font-extrabold text-rose-900 dark:text-rose-200">
                      ทีมบุก (Offense Team)
                    </h2>
                    <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-bold border border-rose-200/40 dark:border-rose-900/40">
                      {parties.filter(pid => partyTeams[pid] === 'offense').length} ปาร์ตี้
                    </span>
                  </div>
                  {parties.filter(pid => partyTeams[pid] === 'offense').length === 0 ? (
                    <div className="text-center py-10 text-xs font-semibold text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                      ยังไม่มีปาร์ตี้ในทีมนี้ (เปลี่ยนทีมของปาร์ตี้ผ่านตัวเลือกขวาบนของการ์ดในโหมดแก้ไข)
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {parties.filter(pid => partyTeams[pid] === 'offense').map((partyId) => (
                        <PartyBlock
                          key={partyId}
                          partyId={partyId}
                          profiles={profiles.filter((p) => p.party_id === partyId)}
                          isAdmin={isAdmin}
                          isEditMode={isEditMode}
                          onEmptySlotClick={(partyId, slotIndex) =>
                            setActiveSlot({ partyId, slotIndex })
                          }
                          onMemberClear={handleClearMember}
                          activity={activity}
                          currentTeam={partyTeams[partyId]}
                          onTeamChange={(team) => handlePartyTeamChange(partyId, team)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ทีมวิ่งบ้าน */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-amber-100 dark:border-amber-900 pb-2">
                    <span className="text-xl">⚡</span>
                    <h2 className="text-base font-extrabold text-amber-900 dark:text-amber-200">
                      ทีมวิ่งบ้าน (Runner Team)
                    </h2>
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-200/40 dark:border-amber-900/40">
                      {parties.filter(pid => partyTeams[pid] === 'runner').length} ปาร์ตี้
                    </span>
                  </div>
                  {parties.filter(pid => partyTeams[pid] === 'runner').length === 0 ? (
                    <div className="text-center py-10 text-xs font-semibold text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                      ยังไม่มีปาร์ตี้ในทีมนี้ (เปลี่ยนทีมของปาร์ตี้ผ่านตัวเลือกขวาบนของการ์ดในโหมดแก้ไข)
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {parties.filter(pid => partyTeams[pid] === 'runner').map((partyId) => (
                        <PartyBlock
                          key={partyId}
                          partyId={partyId}
                          profiles={profiles.filter((p) => p.party_id === partyId)}
                          isAdmin={isAdmin}
                          isEditMode={isEditMode}
                          onEmptySlotClick={(partyId, slotIndex) =>
                            setActiveSlot({ partyId, slotIndex })
                          }
                          onMemberClear={handleClearMember}
                          activity={activity}
                          currentTeam={partyTeams[partyId]}
                          onTeamChange={(team) => handlePartyTeamChange(partyId, team)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeProfile ? <MemberCardOverlay profile={activeProfile} /> : null}
      </DragOverlay>

      {/* Mobile Modal for Waitlist Selection */}
      {activeSlot && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 lg:hidden p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30">
              <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                Select Member for Party {activeSlot.partyId}
              </h2>
              <button
                onClick={() => setActiveSlot(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <WaitlistBlock
                profiles={profiles.filter(
                  (p) => p.party_id === null && !p.is_on_leave,
                )}
                isAdmin={isAdmin}
                isEditMode={isEditMode}
                onMemberClick={assignMemberToSlot}
              />
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          profiles={profiles}
          onClose={() => setShowExportModal(false)}
          activity={activity}
          partyTeams={partyTeams}
        />
      )}
    </DndContext>
  );
}
