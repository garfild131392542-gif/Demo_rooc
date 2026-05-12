'use client'

import { useState, useTransition } from 'react'
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core'
import { updateProfileParty } from '@/app/actions/dashboard'
import PartyBlock from './PartyBlock'
import WaitlistBlock from './WaitlistBlock'
import LeaveListBlock from './LeaveListBlock'
import MemberCard from './MemberCard'

export type Profile = {
  id: string
  uid_game: string
  display_name: string
  job_name: string
  pvp_reduc: number
  pvp_dmg: number
  avatar_url: string
  role: 'admin' | 'member'
  party_id: number | null
  slot_index: number | null
  is_on_leave: boolean
}

export default function Dashboard({ initialProfiles, isAdmin }: { initialProfiles: Profile[], isAdmin: boolean }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSlot, setActiveSlot] = useState<{ partyId: number, slotIndex: number } | null>(null)
  const [isPending, startTransition] = useTransition()

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
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over || !isAdmin) return

    const profileId = active.id as string
    const overId = over.id as string

    let targetPartyId: number | null = null
    let targetSlotIndex: number | null = null

    if (overId === 'waitlist') {
      targetPartyId = null
      targetSlotIndex = null
    } else if (overId.startsWith('party-')) {
      const parts = overId.split('-')
      targetPartyId = parseInt(parts[1])
      targetSlotIndex = parseInt(parts[3])
    } else {
      return
    }

    const sourceProfile = profiles.find(p => p.id === profileId)
    if (!sourceProfile) return

    // If dropped on the same slot, do nothing
    if (sourceProfile.party_id === targetPartyId && sourceProfile.slot_index === targetSlotIndex) {
      return
    }

    // Find if there is an occupant in the target slot
    const occupant = targetPartyId !== null && targetSlotIndex !== null
      ? profiles.find(p => p.party_id === targetPartyId && p.slot_index === targetSlotIndex)
      : null

    // Optimistic Update
    setProfiles((prev) =>
      prev.map(p => {
        if (p.id === profileId) {
          return { ...p, party_id: targetPartyId, slot_index: targetSlotIndex }
        }
        if (occupant && p.id === occupant.id) {
          // Push occupant to waitlist
          return { ...p, party_id: null, slot_index: null }
        }
        return p
      })
    )

    // Sync to server
    startTransition(() => {
      if (occupant) {
        updateProfileParty(occupant.id, null, null)
      }
      updateProfileParty(profileId, targetPartyId, targetSlotIndex)
    })
  }

  const assignMemberToSlot = (memberId: string) => {
    if (!activeSlot || !isAdmin) return
    const { partyId: targetPartyId, slotIndex: targetSlotIndex } = activeSlot

    const sourceProfile = profiles.find(p => p.id === memberId)
    if (!sourceProfile) return

    // If dropped on the same slot, do nothing
    if (sourceProfile.party_id === targetPartyId && sourceProfile.slot_index === targetSlotIndex) {
      setActiveSlot(null)
      return
    }

    const occupant = profiles.find(p => p.party_id === targetPartyId && p.slot_index === targetSlotIndex)

    setProfiles((prev) =>
      prev.map(p => {
        if (p.id === memberId) {
          return { ...p, party_id: targetPartyId, slot_index: targetSlotIndex }
        }
        if (occupant && p.id === occupant.id) {
          return { ...p, party_id: null, slot_index: null }
        }
        return p
      })
    )

    startTransition(() => {
      if (occupant) {
        updateProfileParty(occupant.id, null, null)
      }
      updateProfileParty(memberId, targetPartyId, targetSlotIndex)
    })

    setActiveSlot(null)
  }

  const activeProfile = profiles.find(p => p.id === activeId)

  // Generate Party Arrays
  const parties = Array.from({ length: 16 }, (_, i) => i + 1)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Waitlist & LeaveList (Top on mobile, Right on desktop) - Only visible to admin */}
          {isAdmin && (
            <div className="w-full lg:w-80 shrink-0 sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto flex flex-col gap-4 hidden lg:flex order-1 lg:order-2">
              <WaitlistBlock
                profiles={profiles.filter(p => p.party_id === null && !p.is_on_leave)}
                isAdmin={isAdmin}
              />
              <LeaveListBlock
                profiles={profiles.filter(p => p.party_id === null && p.is_on_leave)}
              />
            </div>
          )}

          {/* Left Side: 16 Parties */}
          <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 order-2 lg:order-1">
            {parties.map(partyId => (
              <PartyBlock
                key={partyId}
                partyId={partyId}
                profiles={profiles.filter(p => p.party_id === partyId)}
                isAdmin={isAdmin}
                onEmptySlotClick={(partyId, slotIndex) => setActiveSlot({ partyId, slotIndex })}
              />
            ))}
          </div>

        </div>
      </div>

      <DragOverlay>
        {activeProfile ? <MemberCard profile={activeProfile} isOverlay /> : null}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <WaitlistBlock
                profiles={profiles.filter(p => p.party_id === null && !p.is_on_leave)}
                isAdmin={isAdmin}
                onMemberClick={assignMemberToSlot}
              />
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}
