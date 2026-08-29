"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
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
import { updateProfileParty, swapPartyMembers } from "@/app/actions/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import PartyBlock, { TEAM_COLOR_MAP } from "./PartyBlock";
import WaitlistBlock from "./WaitlistBlock";
import LeaveListBlock from "./LeaveListBlock";
import MemberCard, { MemberCardOverlay } from "./MemberCard";
import ExportModal from "./ExportModal";
import CustomTeamModal, { DEFAULT_CUSTOM_GROUPS } from "./CustomTeamModal";
import { CustomTeamGroup } from "@/types/database";

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
  guildId,
}: {
  initialProfiles: Profile[];
  isAdmin: boolean;
  guildId?: string | null;
}) {
  const queryClient = useQueryClient();

  // ⚡ TanStack Query: Cache guild profiles in memory with instant retrieval
  const { data: queryProfiles, refetch } = useQuery<Profile[]>({
    queryKey: ['guildProfiles', guildId],
    queryFn: async () => {
      if (!guildId) return initialProfiles;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('guild_id', guildId)
        .order('id', { ascending: true });
      if (error) throw error;
      return (data as Profile[]) || [];
    },
    initialData: initialProfiles,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);

  // Sync state when queryProfiles updates (e.g. from background refetch or realtime)
  useEffect(() => {
    if (queryProfiles) {
      setProfiles(queryProfiles);
    }
  }, [queryProfiles]);

  // ⚡ Supabase Realtime: Sync party positions live across all connected users (Debounced 200ms)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!guildId) return;

    const supabase = createClient();
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        refetch();
      }, 200);
    };

    const channel = supabase
      .channel(`dashboard_party_sync_${guildId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `guild_id=eq.${guildId}`,
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [guildId, refetch]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<{
    partyId: number;
    slotIndex: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCustomTeamModal, setShowCustomTeamModal] = useState(false);

  // Guild Activity and Party Team assignment states
  const [activity, setActivity] = useState<'general' | 'guild_league' | 'emperium_overrun'>('general');
  const [planTitle, setPlanTitle] = useState<string>('แผนจัดทีม Emperium Overrun');
  const [planSubtitle, setPlanSubtitle] = useState<string>('แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม');
  const [customGroups, setCustomGroups] = useState<CustomTeamGroup[]>(DEFAULT_CUSTOM_GROUPS);

  const mappedProfiles = useMemo(() => {
    return profiles.map((p) => {
      if (activity === "guild_league") {
        return {
          ...p,
          party_id: (p as any).party_id_guild_league ?? null,
          slot_index: (p as any).slot_index_guild_league ?? null,
        };
      } else if (activity === "emperium_overrun") {
        return {
          ...p,
          party_id: (p as any).party_id_emperium_overrun ?? null,
          slot_index: (p as any).slot_index_emperium_overrun ?? null,
        };
      } else {
        return p;
      }
    });
  }, [profiles, activity]);

  useEffect(() => {
    const savedActivity = localStorage.getItem('rooc_active_activity');
    if (savedActivity) {
      setActivity(savedActivity as any);
    }
    const savedCustomGroups = localStorage.getItem('rooc_custom_groups');
    if (savedCustomGroups) {
      try {
        const parsed = JSON.parse(savedCustomGroups);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomGroups(parsed);
        }
      } catch (e) { }
    }
    const savedTitle = localStorage.getItem('rooc_custom_plan_title');
    if (savedTitle) setPlanTitle(savedTitle);
    const savedSubtitle = localStorage.getItem('rooc_custom_plan_subtitle');
    if (savedSubtitle) setPlanSubtitle(savedSubtitle);
  }, []);

  const handleActivityChange = (act: 'general' | 'guild_league' | 'emperium_overrun') => {
    setActivity(act);
    localStorage.setItem('rooc_active_activity', act);
  };

  const handleSaveCustomGroups = (newGroups: CustomTeamGroup[]) => {
    setCustomGroups(newGroups);
    localStorage.setItem('rooc_custom_groups', JSON.stringify(newGroups));
  };

  const handleSavePlanTitle = (title: string) => {
    setPlanTitle(title);
    localStorage.setItem('rooc_custom_plan_title', title);
  };

  const handleSavePlanSubtitle = (sub: string) => {
    setPlanSubtitle(sub);
    localStorage.setItem('rooc_custom_plan_subtitle', sub);
  };

  const handlePartyTeamChange = (partyId: number, targetTeamId: string) => {
    setCustomGroups(prev => {
      const updated = prev.map(group => {
        if (group.id === targetTeamId) {
          if (!group.partyIds.includes(partyId)) {
            return { ...group, partyIds: [...group.partyIds, partyId].sort((a, b) => a - b) };
          }
          return group;
        } else {
          return { ...group, partyIds: group.partyIds.filter(id => id !== partyId) };
        }
      });
      localStorage.setItem('rooc_custom_groups', JSON.stringify(updated));
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
      prev.map((p) => {
        if (p.id === memberId) {
          if (activity === "guild_league") {
            return {
              ...p,
              party_id_guild_league: null,
              slot_index_guild_league: null,
            };
          } else if (activity === "emperium_overrun") {
            return {
              ...p,
              party_id_emperium_overrun: null,
              slot_index_emperium_overrun: null,
            };
          } else {
            return { ...p, party_id: null, slot_index: null };
          }
        }
        return p;
      })
    );

    // 2. Sync to DB in the background
    startTransition(() => {
      updateProfileParty(memberId, null, null, activity);
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

    const activePartyId =
      activity === "guild_league"
        ? (sourceProfile as any).party_id_guild_league ?? null
        : activity === "emperium_overrun"
        ? (sourceProfile as any).party_id_emperium_overrun ?? null
        : sourceProfile.party_id;

    const activeSlotIndex =
      activity === "guild_league"
        ? (sourceProfile as any).slot_index_guild_league ?? null
        : activity === "emperium_overrun"
        ? (sourceProfile as any).slot_index_emperium_overrun ?? null
        : sourceProfile.slot_index;

    // If dropped on the same slot, do nothing
    if (
      activePartyId === targetPartyId &&
      activeSlotIndex === targetSlotIndex
    ) {
      return;
    }

    // Find if there is an occupant in the target slot
    const occupant =
      targetPartyId !== null && targetSlotIndex !== null
        ? profiles.find((p) => {
            const pId =
              activity === "guild_league"
                ? (p as any).party_id_guild_league ?? null
                : activity === "emperium_overrun"
                ? (p as any).party_id_emperium_overrun ?? null
                : p.party_id;
            const pIdx =
              activity === "guild_league"
                ? (p as any).slot_index_guild_league ?? null
                : activity === "emperium_overrun"
                ? (p as any).slot_index_emperium_overrun ?? null
                : p.slot_index;
            return pId === targetPartyId && pIdx === targetSlotIndex;
          })
        : null;

    // Snapshot for rollback in case of server failure
    const previousProfiles = [...profiles];

    // Optimistic Update (Immediate 0ms UI update)
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === profileId) {
          if (activity === "guild_league") {
            return {
              ...p,
              party_id_guild_league: targetPartyId,
              slot_index_guild_league: targetSlotIndex,
            };
          } else if (activity === "emperium_overrun") {
            return {
              ...p,
              party_id_emperium_overrun: targetPartyId,
              slot_index_emperium_overrun: targetSlotIndex,
            };
          } else {
            return {
              ...p,
              party_id: targetPartyId,
              slot_index: targetSlotIndex,
            };
          }
        }
        if (occupant && p.id === occupant.id) {
          if (activity === "guild_league") {
            return {
              ...p,
              party_id_guild_league: null,
              slot_index_guild_league: null,
            };
          } else if (activity === "emperium_overrun") {
            return {
              ...p,
              party_id_emperium_overrun: null,
              slot_index_emperium_overrun: null,
            };
          } else {
            return { ...p, party_id: null, slot_index: null };
          }
        }
        return p;
      })
    );

    // Sync to server in 1 single request with auto-rollback
    startTransition(async () => {
      const res = await swapPartyMembers(
        profileId,
        occupant ? occupant.id : null,
        targetPartyId,
        targetSlotIndex,
        activity
      );
      if (!res.success) {
        setProfiles(previousProfiles);
        alert(`ไม่สามารถบันทึกตำแหน่งปาร์ตี้ได้: ${res.error || 'Unknown error'}`);
      }
    });
  };

  const assignMemberToSlot = (memberId: string) => {
    if (!activeSlot || !isAdmin) return;
    const { partyId: targetPartyId, slotIndex: targetSlotIndex } = activeSlot;

    const sourceProfile = profiles.find((p) => p.id === memberId);
    if (!sourceProfile) return;

    const activePartyId =
      activity === "guild_league"
        ? (sourceProfile as any).party_id_guild_league ?? null
        : activity === "emperium_overrun"
        ? (sourceProfile as any).party_id_emperium_overrun ?? null
        : sourceProfile.party_id;

    const activeSlotIndex =
      activity === "guild_league"
        ? (sourceProfile as any).slot_index_guild_league ?? null
        : activity === "emperium_overrun"
        ? (sourceProfile as any).slot_index_emperium_overrun ?? null
        : sourceProfile.slot_index;

    // If dropped on the same slot, do nothing
    if (
      activePartyId === targetPartyId &&
      activeSlotIndex === targetSlotIndex
    ) {
      setActiveSlot(null);
      return;
    }

    const occupant = profiles.find((p) => {
      const pId =
        activity === "guild_league"
          ? (p as any).party_id_guild_league ?? null
          : activity === "emperium_overrun"
          ? (p as any).party_id_emperium_overrun ?? null
          : p.party_id;
      const pIdx =
        activity === "guild_league"
          ? (p as any).slot_index_guild_league ?? null
          : activity === "emperium_overrun"
          ? (p as any).slot_index_emperium_overrun ?? null
          : p.slot_index;
      return pId === targetPartyId && pIdx === targetSlotIndex;
    });

    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id === memberId) {
          if (activity === "guild_league") {
            return {
              ...p,
              party_id_guild_league: targetPartyId,
              slot_index_guild_league: targetSlotIndex,
            };
          } else if (activity === "emperium_overrun") {
            return {
              ...p,
              party_id_emperium_overrun: targetPartyId,
              slot_index_emperium_overrun: targetSlotIndex,
            };
          } else {
            return {
              ...p,
              party_id: targetPartyId,
              slot_index: targetSlotIndex,
            };
          }
        }
        if (occupant && p.id === occupant.id) {
          if (activity === "guild_league") {
            return {
              ...p,
              party_id_guild_league: null,
              slot_index_guild_league: null,
            };
          } else if (activity === "emperium_overrun") {
            return {
              ...p,
              party_id_emperium_overrun: null,
              slot_index_emperium_overrun: null,
            };
          } else {
            return { ...p, party_id: null, slot_index: null };
          }
        }
        return p;
      })
    );

    startTransition(() => {
      if (occupant) {
        updateProfileParty(occupant.id, null, null, activity);
      }
      updateProfileParty(memberId, targetPartyId, targetSlotIndex, activity);
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
            🏰 Emperium Overrun / Custom
          </button>
        </div>

        {/* Custom Team Management Banner */}
        {activity === 'emperium_overrun' && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 via-amber-50 to-indigo-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-indigo-950/30 border border-orange-200/80 dark:border-orange-900/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                  <span>🏰</span> {planTitle}
                </h3>
                <span className="text-[10px] bg-orange-200/60 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-300/40">
                  {customGroups.length} กลุ่มทีม
                </span>
              </div>
              <p className="text-xs text-orange-800/80 dark:text-orange-400/90 font-medium">
                {planSubtitle}
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCustomTeamModal(true)}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>⚙️</span> ปรับแต่งกลุ่มทีม & แผน
              </button>
            )}
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
                    profiles={mappedProfiles.filter(
                      (p) => p.party_id === null && !p.is_on_leave,
                    )}
                    isAdmin={isAdmin}
                    isEditMode={isEditMode}
                  />
                </div>
                <div>
                  <LeaveListBlock
                    profiles={mappedProfiles.filter(
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
                    profiles={mappedProfiles.filter((p) => p.party_id === partyId)}
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
                        profiles={mappedProfiles.filter((p) => p.party_id === partyId)}
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
                        profiles={mappedProfiles.filter((p) => p.party_id === partyId)}
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
                {customGroups.map((group) => {
                  const groupParties = parties.filter(pid => group.partyIds?.includes(pid))
                  const colorMeta = TEAM_COLOR_MAP[group.colorTheme || 'blue'] || TEAM_COLOR_MAP.blue

                  return (
                    <div key={group.id} className="space-y-4">
                      <div className={`flex items-center justify-between border-b ${colorMeta.headerBorder} pb-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{group.icon}</span>
                          <h2 className={`text-base font-extrabold ${colorMeta.titleColor}`}>
                            {group.name}
                          </h2>
                          <span className={`text-[10px] ${colorMeta.bgBadge} ${colorMeta.text} ${colorMeta.darkText} px-2 py-0.5 rounded-full font-bold border ${colorMeta.borderBadge}`}>
                            {groupParties.length} ปาร์ตี้
                          </span>
                        </div>
                      </div>

                      {groupParties.length === 0 ? (
                        <div className="text-center py-8 text-xs font-semibold text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                          ยังไม่มีปาร์ตี้ในทีมนี้ (ย้ายปาร์ตี้ผ่านตัวเลือกขวาบนของการ์ดในโหมดแก้ไข หรือผ่านเมนู "ปรับแต่งกลุ่มทีม & แผน")
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {groupParties.map((partyId) => (
                            <PartyBlock
                              key={partyId}
                              partyId={partyId}
                              profiles={mappedProfiles.filter((p) => p.party_id === partyId)}
                              isAdmin={isAdmin}
                              isEditMode={isEditMode}
                              onEmptySlotClick={(partyId, slotIndex) =>
                                setActiveSlot({ partyId, slotIndex })
                              }
                              onMemberClear={handleClearMember}
                              activity={activity}
                              customGroups={customGroups}
                              currentTeamId={group.id}
                              onTeamChange={(newTeamId) => handlePartyTeamChange(partyId, newTeamId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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
                profiles={mappedProfiles.filter(
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

      {/* Custom Team Modal */}
      <CustomTeamModal
        isOpen={showCustomTeamModal}
        onClose={() => setShowCustomTeamModal(false)}
        customGroups={customGroups}
        onSaveGroups={handleSaveCustomGroups}
        planTitle={planTitle}
        onSavePlanTitle={handleSavePlanTitle}
        planSubtitle={planSubtitle}
        onSavePlanSubtitle={handleSavePlanSubtitle}
      />

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          profiles={mappedProfiles}
          onClose={() => setShowExportModal(false)}
          activity={activity}
          customGroups={customGroups}
          planTitle={planTitle}
          planSubtitle={planSubtitle}
        />
      )}
    </DndContext>
  );
}
