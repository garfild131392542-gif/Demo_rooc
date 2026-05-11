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

  const activeProfile = profiles.find(p => p.id === activeId)

  // Generate Party Arrays
  const parties = Array.from({ length: 16 }, (_, i) => i + 1)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="overflow-x-auto pb-8">
        <div className="flex flex-row gap-8 items-start min-w-[1200px]">
          {/* Left Side: 16 Parties */}
          <div className="flex-1 grid grid-cols-4 gap-6">
            {parties.map(partyId => (
              <PartyBlock
                key={partyId}
                partyId={partyId}
                profiles={profiles.filter(p => p.party_id === partyId)}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {/* Right Side: Waitlist & LeaveList */}
          <div className="w-80 shrink-0 sticky top-4 flex flex-col gap-6 h-[calc(100vh-2rem)]">
            <WaitlistBlock
              profiles={profiles.filter(p => p.party_id === null && !p.is_on_leave)}
              isAdmin={isAdmin}
            />
            <LeaveListBlock 
              profiles={profiles.filter(p => p.party_id === null && p.is_on_leave)}
            />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeProfile ? <MemberCard profile={activeProfile} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
