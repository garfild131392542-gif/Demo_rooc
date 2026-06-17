"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Profile } from "./Dashboard";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { getJobIconUrl } from "@/components/helpers"; // ดึงรูปไอคอนมาใช้

/** Pure visual snapshot used inside <DragOverlay> — no dnd hooks, no duplicate ID conflict. */
export function MemberCardOverlay({ profile }: { profile: Profile }) {
  // เปลี่ยนมาดึง URL รูปภาพแทนสี
  const jobIcon = getJobIconUrl(profile.job_name);

  return (
    <div className="relative bg-white dark:bg-gray-800 p-3 rounded-lg shadow-2xl ring-2 ring-indigo-500 rotate-2 border border-gray-200 dark:border-gray-700 cursor-grabbing z-10">
      <div className="flex items-center space-x-3">
        {/* เปลี่ยนจาก div วงกลมสี เป็น img แสดงโลโก้อาชีพ */}
        <img
          src={jobIcon}
          alt={profile.job_name}
          className="w-8 h-8 object-contain shrink-0 drop-shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {profile.display_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {profile.job_name || "No Job"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MemberCard({
  profile,
  isAdmin,
  isEditMode = false,
  onClick,
  onClear,
}: {
  profile: Profile;
  isAdmin?: boolean;
  isEditMode?: boolean;
  onClick?: () => void;
  onClear?: (id: string) => void;
}) {
  const isDraggable = !!isAdmin && isEditMode;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: profile.id,
    disabled: !isDraggable,
  });

  const style = { transform: CSS.Translate.toString(transform) };

  const [showPopup, setShowPopup] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);

  // เปลี่ยนมาดึง URL รูปภาพแทนสี
  const jobIcon = getJobIconUrl(profile.job_name);
  const cardRef = useRef<HTMLDivElement>(null);

  // Gate portal rendering until after hydration to prevent SSR mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Position TOP horizontally centered
    setCoords({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setShowPopup(true);
  };

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    cardRef.current = node;
  };

  // Cursor class based on mode
  const cursorClass = isDraggable
    ? "cursor-grab active:cursor-grabbing"
    : onClick
      ? "cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500"
      : "cursor-default";

  return (
    <div
      ref={setRefs}
      style={style}
      {...listeners}
      {...attributes}
      suppressHydrationWarning
      className={`relative group bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        ${cursorClass}
        ${isDraggable ? "touch-none" : ""}
        hover:shadow-md transition-shadow z-10`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPopup(false)}
      onClick={onClick}
    >
      {/* Red cross (clear) button — only shown in Edit Mode */}
      {isAdmin && isEditMode && profile.party_id && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (
              confirm(
                `ต้องการนำคุณ ${profile.display_name} ออกจากปาร์ตี้ใช่หรือไม่?`,
              )
            ) {
              if (onClear) onClear(profile.id);
            }
          }}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg z-[50] opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          title="ล้างค่าปาร์ตี้"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Card content */}
      <div className="flex items-center space-x-3">
        {/* เปลี่ยนจาก div วงกลมสี เป็น img แสดงโลโก้อาชีพ */}
        <img
          src={jobIcon}
          alt={profile.job_name}
          className="w-11 h-11 object-contain shrink-0 drop-shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {profile.display_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {profile.job_name || "No Job"}
          </p>
        </div>
      </div>

      {/* Hover Popup using Portal to escape overflow-hidden containers */}
      {showPopup &&
        isMounted &&
        createPortal(
          <div
            // 💡 ขยายความกว้างเป็น w-56 และเพิ่ม padding เป็น p-3
            className=" fixed w-56 p-3 bg-gray-900 text-white rounded shadow-lg z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full opacity-100 transition-opacity"
            style={{ top: coords.y, left: coords.x }}
          >
            <div className="flex flex-col items-center">
              <img
                src={jobIcon}
                alt={profile.job_name}
                className="w-16 h-16 object-contain mb-2 drop-shadow-sm"
              />

              {/* 💡 ขยายชื่อเป็น text-sm */}
              <p className="font-bold text-center text-sm truncate w-full px-1">
                {profile.display_name}
              </p>

              {/* 💡 เปลี่ยนขนาดจาก text-[10px] เป็น text-xs และเพิ่มระยะห่างบรรทัด (gap-y-2) */}
              <div className="w-full mt-2 text-xs grid grid-cols-2 gap-x-2 gap-y-2 text-center border-t border-gray-700 pt-2">
                <div>
                  {/* คู่ HP/SP */}
                  <p className="text-gray-400">HP</p>
                  <p className="font-medium text-green-400">
                    {profile.hp ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">SP</p>
                  <p className="font-medium text-blue-300">{profile.sp ?? 0}</p>
                </div>
                {/* คู่ ATK */}
                <div>
                  <p className="text-gray-400">P.ATK</p>
                  <p className="font-medium text-red-400">
                    {profile.p_atk ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">M.ATK</p>
                  <p className="font-medium text-orange-400">
                    {profile.m_atk ?? 0}
                  </p>
                </div>

                {/* คู่ DEF */}
                <div>
                  <p className="text-gray-400">P.DEF</p>
                  <p className="font-medium text-blue-400">
                    {profile.p_def ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">M.DEF</p>
                  <p className="font-medium text-purple-400">
                    {profile.m_def ?? 0}
                  </p>
                </div>

                {/* คู่ DMG */}
                <div>
                  <p className="text-gray-400">P.DMG</p>
                  <p className="font-medium text-red-500">
                    {profile.p_dmg ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">M.DMG</p>
                  <p className="font-medium text-orange-500">
                    {profile.m_dmg ?? 0}
                  </p>
                </div>

                {/* คู่ Ignore */}
                <div>
                  <p className="text-gray-400">Ign. P.DEF</p>
                  <p className="font-medium text-slate-300">
                    {profile.ignore_pdef ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Ign. M.DEF</p>
                  <p className="font-medium text-slate-300">
                    {profile.ignore_mdef ?? 0}
                  </p>
                </div>

                {/* คู่ Reduc */}
                <div>
                  <p className="text-gray-400">P.Reduc</p>
                  <p className="font-medium text-blue-500">
                    {profile.p_reduc ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">M.Reduc</p>
                  <p className="font-medium text-purple-500">
                    {profile.m_reduc ?? 0}
                  </p>
                </div>

                {/* คู่ PvP */}
                <div>
                   <p className="text-gray-400">PvP DMG</p>
                   <p className="font-medium text-rose-400">{profile.pvp_dmg}</p>
                </div>
                <div>
                   <p className="text-gray-400">PvP Reduc</p>
                   <p className="font-medium text-emerald-400">
                     {profile.pvp_reduc}
                   </p>
                </div>

                {/* คู่ Cri */}
                <div>
                   <p className="text-gray-400">Cri</p>
                   <p className="font-medium text-amber-400">
                     {profile.cri ?? 0}
                   </p>
                </div>
                <div>
                   <p className="text-gray-400">Cri Dam</p>
                   <p className="font-medium text-amber-400">
                     {profile.cri_dmg ?? 0}%
                   </p>
                </div>
              </div>
            </div>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>,
          document.body,
        )}
    </div>
  );
}
