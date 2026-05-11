'use client'

import { useDroppable } from '@dnd-kit/core'
import { Profile } from './Dashboard'
import MemberCard from './MemberCard'

function PartySlot({ partyId, slotIndex, profile, isAdmin }: { partyId: number, slotIndex: number, profile?: Profile, isAdmin: boolean }) {
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
          <MemberCard profile={profile} isAdmin={isAdmin} />
        </div>
      ) : (
        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Slot {slotIndex + 1}</span>
      )}
    </div>
  )
}

export default function PartyBlock({ partyId, profiles, isAdmin }: { partyId: number, profiles: Profile[], isAdmin: boolean }) {
  const slots = Array.from({ length: 5 }, (_, i) => i)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
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
            />
          )
        })}
      </div>
    </div>
  )
}
