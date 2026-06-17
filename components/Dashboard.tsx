"use client";

import { useState, useTransition } from "react";
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
                ${
                  isEditMode
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

          {/* Left Side: 16 Parties */}
          <div className="flex-1 w-full order-2 lg:order-1">
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
                />
              ))}
            </div>
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
        />
      )}
    </DndContext>
  );
}
