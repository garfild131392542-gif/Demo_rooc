'use client'

import { useDroppable } from '@dnd-kit/core'
import { Profile } from './Dashboard'
import MemberCard from './MemberCard'
import { CustomTeamGroup, TeamColorTheme } from '@/types/database'

export const TEAM_COLOR_MAP: Record<TeamColorTheme, {
  text: string
  darkText: string
  bgBadge: string
  borderBadge: string
  headerBorder: string
  titleColor: string
  hexBg: string
  hexBorder: string
  hexText: string
}> = {
  blue: {
    text: 'text-blue-600',
    darkText: 'dark:text-blue-400',
    bgBadge: 'bg-blue-50 dark:bg-blue-950/60',
    borderBadge: 'border-blue-200/40 dark:border-blue-900/40',
    headerBorder: 'border-blue-100 dark:border-blue-900',
    titleColor: 'text-blue-900 dark:text-blue-200',
    hexBg: '#dbeafe',
    hexBorder: '#93c5fd',
    hexText: '#1e40af',
  },
  rose: {
    text: 'text-rose-600',
    darkText: 'dark:text-rose-400',
    bgBadge: 'bg-rose-50 dark:bg-rose-950/60',
    borderBadge: 'border-rose-200/40 dark:border-rose-900/40',
    headerBorder: 'border-rose-100 dark:border-rose-900',
    titleColor: 'text-rose-900 dark:text-rose-200',
    hexBg: '#ffe4e6',
    hexBorder: '#fda4af',
    hexText: '#9f1239',
  },
  amber: {
    text: 'text-amber-600',
    darkText: 'dark:text-amber-400',
    bgBadge: 'bg-amber-50 dark:bg-amber-950/60',
    borderBadge: 'border-amber-200/40 dark:border-amber-900/40',
    headerBorder: 'border-amber-100 dark:border-amber-900',
    titleColor: 'text-amber-900 dark:text-amber-200',
    hexBg: '#fef3c7',
    hexBorder: '#fcd34d',
    hexText: '#92400e',
  },
  emerald: {
    text: 'text-emerald-600',
    darkText: 'dark:text-emerald-400',
    bgBadge: 'bg-emerald-50 dark:bg-emerald-950/60',
    borderBadge: 'border-emerald-200/40 dark:border-emerald-900/40',
    headerBorder: 'border-emerald-100 dark:border-emerald-900',
    titleColor: 'text-emerald-900 dark:text-emerald-200',
    hexBg: '#d1fae5',
    hexBorder: '#6ee7b7',
    hexText: '#065f46',
  },
  purple: {
    text: 'text-purple-600',
    darkText: 'dark:text-purple-400',
    bgBadge: 'bg-purple-50 dark:bg-purple-950/60',
    borderBadge: 'border-purple-200/40 dark:border-purple-900/40',
    headerBorder: 'border-purple-100 dark:border-purple-900',
    titleColor: 'text-purple-900 dark:text-purple-200',
    hexBg: '#f3e8ff',
    hexBorder: '#d8b4fe',
    hexText: '#6b21a8',
  },
  indigo: {
    text: 'text-indigo-600',
    darkText: 'dark:text-indigo-400',
    bgBadge: 'bg-indigo-50 dark:bg-indigo-950/60',
    borderBadge: 'border-indigo-200/40 dark:border-indigo-900/40',
    headerBorder: 'border-indigo-100 dark:border-indigo-900',
    titleColor: 'text-indigo-900 dark:text-indigo-200',
    hexBg: '#e0e7ff',
    hexBorder: '#a5b4fc',
    hexText: '#3730a3',
  },
  cyan: {
    text: 'text-cyan-600',
    darkText: 'dark:text-cyan-400',
    bgBadge: 'bg-cyan-50 dark:bg-cyan-950/60',
    borderBadge: 'border-cyan-200/40 dark:border-cyan-900/40',
    headerBorder: 'border-cyan-100 dark:border-cyan-900',
    titleColor: 'text-cyan-900 dark:text-cyan-200',
    hexBg: '#cffafe',
    hexBorder: '#67e8f9',
    hexText: '#155e75',
  },
  slate: {
    text: 'text-slate-600',
    darkText: 'dark:text-slate-400',
    bgBadge: 'bg-slate-50 dark:bg-slate-900/60',
    borderBadge: 'border-slate-200/40 dark:border-slate-800/40',
    headerBorder: 'border-slate-100 dark:border-slate-800',
    titleColor: 'text-slate-900 dark:text-slate-200',
    hexBg: '#f1f5f9',
    hexBorder: '#cbd5e1',
    hexText: '#334155',
  },
}

function PartySlot({
  partyId,
  slotIndex,
  profile,
  isAdmin,
  isEditMode,
  onEmptySlotClick,
  onMemberClear,
}: {
  partyId: number
  slotIndex: number
  profile?: Profile
  isAdmin: boolean
  isEditMode: boolean
  onEmptySlotClick?: (partyId: number, slotIndex: number) => void
  onMemberClear?: (memberId: string) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `party-${partyId}-slot-${slotIndex}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`h-[4.5rem] rounded-lg border-2 border-dashed transition-colors flex items-center justify-center p-2
        ${isOver ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}
        ${profile ? 'border-none p-0' : ''}`}
    >
      {profile ? (
        <div className="w-full h-full">
          <MemberCard
            profile={profile}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            onClear={onMemberClear ? () => onMemberClear(profile.id) : undefined}
          />
        </div>
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center rounded-lg transition-colors ${isAdmin ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''}`}
          onClick={isAdmin && onEmptySlotClick ? () => onEmptySlotClick(partyId, slotIndex) : undefined}
        >
          <span className={`text-sm font-medium text-gray-400 dark:text-gray-500 ${isAdmin ? 'hidden lg:block' : ''}`}>Slot {slotIndex + 1}</span>
          {isAdmin && (
            <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400 lg:hidden flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function PartyBlock({
  partyId,
  profiles,
  isAdmin,
  isEditMode,
  onEmptySlotClick,
  onMemberClear,
  activity = 'general',
  customGroups,
  currentTeamId,
  onTeamChange,
}: {
  partyId: number
  profiles: Profile[]
  isAdmin: boolean
  isEditMode: boolean
  onEmptySlotClick?: (partyId: number, slotIndex: number) => void
  onMemberClear?: (memberId: string) => void
  activity?: 'general' | 'guild_league' | 'emperium_overrun'
  customGroups?: CustomTeamGroup[]
  currentTeamId?: string
  onTeamChange?: (teamId: string) => void
}) {
  const slots = Array.from({ length: 5 }, (_, i) => i)

  // Find assigned group for this party if customGroups is provided
  const matchedGroup = customGroups?.find(g => g.id === currentTeamId || g.partyIds?.includes(partyId))
  const colorStyle = matchedGroup ? TEAM_COLOR_MAP[matchedGroup.colorTheme || 'blue'] : TEAM_COLOR_MAP.blue

  return (
    <div className="bg-white dark:bg-gray-850 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden glass-panel">
      <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 truncate">Party {partyId}</h3>
          {activity === 'guild_league' && (
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              {partyId <= 8 ? '🛡️ ทีมหลัก (40 คน)' : '⚔️ ทีมรอง (40 คน)'}
            </span>
          )}
          {activity === 'emperium_overrun' && matchedGroup && (
            <span className={`text-[10px] font-semibold truncate ${colorStyle.text} ${colorStyle.darkText}`}>
              {matchedGroup.icon} {matchedGroup.name}
            </span>
          )}
        </div>

        {activity === 'emperium_overrun' && isAdmin && isEditMode && onTeamChange && customGroups && customGroups.length > 0 && (
          <select
            value={matchedGroup?.id ?? customGroups[0].id}
            onChange={(e) => onTeamChange(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-[10px] font-bold px-1.5 py-0.5 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer max-w-[110px] truncate"
          >
            {customGroups.map(g => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="p-4 space-y-3">
        {slots.map(slotIndex => {
          const profile = profiles.find(p => p.slot_index === slotIndex)
          return (
            <PartySlot
              key={slotIndex}
              partyId={partyId}
              slotIndex={slotIndex}
              profile={profile}
              isAdmin={isAdmin}
              isEditMode={isEditMode}
              onEmptySlotClick={onEmptySlotClick}
              onMemberClear={onMemberClear}
            />
          )
        })}
      </div>
    </div>
  )
}
