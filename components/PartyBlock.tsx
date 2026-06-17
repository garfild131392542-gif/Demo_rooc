'use client'

import { useDroppable } from '@dnd-kit/core'
import { Profile } from './Dashboard'
import MemberCard from './MemberCard'

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
}: {
  partyId: number
  profiles: Profile[]
  isAdmin: boolean
  isEditMode: boolean
  onEmptySlotClick?: (partyId: number, slotIndex: number) => void
  onMemberClear?: (memberId: string) => void
}) {
  const slots = Array.from({ length: 5 }, (_, i) => i)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden glass-panel">
      <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Party {partyId}</h3>
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
