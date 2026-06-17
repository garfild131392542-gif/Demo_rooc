'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveAuctionSession } from '@/app/actions/auction'
import { ITEM_CONFIG } from './constants'
import AuctionWindow from './AuctionWindow'
import AdminForm from './AdminForm'
import AdminLimits from './AdminLimits'

export default function AuctionBoard({ data: initialData, onRefresh }: { data: any; onRefresh?: () => void }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const { isAdmin, todayItems, memberQueues, myProfile, history = [] } = data
  
  const [currentPage, setCurrentPage] = useState(1)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'Album' | 'Puppet' | 'White' | 'RedBlack'>('all')
  const [isSaving, setIsSaving] = useState(false)
  // Debug flag to help trace slot generation in browser console when investigating UI issues
  const DEBUG_AUCTION = true

  useEffect(() => {
    setData(initialData)
  }, [initialData])
  
  const [limits, setLimits] = useState<Record<'Album' | 'Puppet' | 'White' | 'RedBlack', number | ''>>(() => {
    const init: Record<'Album' | 'Puppet' | 'White' | 'RedBlack', number | ''> = { Album: '', Puppet: '', White: '', RedBlack: '' }
    todayItems?.forEach((item: any) => {
      if (item.item_name in init) (init as any)[item.item_name] = item.personal_limit
    })
    return init
  })

  const [positions, setPositions] = useState<Record<'Album' | 'Puppet' | 'White' | 'RedBlack', { startPage: string; startSlot: string; endPage: string; endSlot: string; total: number | '' }>>(() => {
    const init: Record<'Album' | 'Puppet' | 'White' | 'RedBlack', { startPage: string; startSlot: string; endPage: string; endSlot: string; total: number | '' }> = {
      Album: { startPage: '', startSlot: '', endPage: '', endSlot: '', total: 0 },
      Puppet: { startPage: '', startSlot: '', endPage: '', endSlot: '', total: 0 },
      White: { startPage: '', startSlot: '', endPage: '', endSlot: '', total: 0 },
      RedBlack: { startPage: '', startSlot: '', endPage: '', endSlot: '', total: 0 },
    }
    todayItems?.forEach((item: any) => {
      if (item.item_name in init) (init as any)[item.item_name].total = item.total_quantity
    })
    return init
  })

  // ✨ ใหม่: Direct mapping จาก memberQueues - แต่ละ row = 1 slot (no allocation logic)
  const { boardSlots, waitlistSlots, rawSlots } = useMemo(() => {
    let slots: any[] = []
    const priorityOrder: ('Album' | 'Puppet' | 'White' | 'RedBlack')[] = ['Album', 'Puppet', 'White', 'RedBlack']

    // ✨ Group by booking session: (user_id, item_type, queue_timestamp)
    const bookingGroups = new Map<string, any[]>()
    const queuesByType = (memberQueues || []).reduce((acc: any, q: any) => {
      if (!acc[q.item_type]) acc[q.item_type] = []
      acc[q.item_type].push(q)
      
      // Create booking session key
      const sessionKey = `${q.uid_game}|${q.item_type}|${q.queue_timestamp || 'no-timestamp'}`
      if (!bookingGroups.has(sessionKey)) {
        bookingGroups.set(sessionKey, [])
      }
      bookingGroups.get(sessionKey)!.push(q)
      
      return acc
    }, {})

    // ✨ สำหรับแต่ละ type ให้ทำการ populate empty slots ก่อน
    priorityOrder.forEach(type => {
      const session = (todayItems || []).find((s: any) => s.item_name === type)
      // Hide inactive items: Only render items where total_quantity > 0 and status === 'active'
      if (!session || session.status !== 'active' || (session.total_quantity ?? 0) <= 0) {
        return
      }

      const itemConfig = ITEM_CONFIG[type]
      const personalLimit = session.personal_limit ?? 0
      
      // Safe guard: skip if no session or config
      if (!itemConfig) return
      
      // ✨ Count total slots per user for this item type
      const userTotalSlotsMap = new Map<string, number>()
      ;(queuesByType[type] || []).forEach((q: any) => {
        const key = q.uid_game
        userTotalSlotsMap.set(key, (userTotalSlotsMap.get(key) ?? 0) + 1)
      })
      
      // ✨ Filter by personal_limit: only show slots if user's total doesn't exceed limit
      let shownCountPerUser = new Map<string, number>() // Track how many we've shown per user
      const qualifiedQueues = (queuesByType[type] || []).filter((q: any) => {
        const totalSlots = userTotalSlotsMap.get(q.uid_game) ?? 0
        const alreadyShown = shownCountPerUser.get(q.uid_game) ?? 0
        const shouldShow = alreadyShown < personalLimit
        
        if (shouldShow) {
          shownCountPerUser.set(q.uid_game, alreadyShown + 1)
        }
        
        return shouldShow
      })
      
      // ✨ Sort by stable identifiers to maintain consistent order
      // Sort by: queue_timestamp → slot_number → id
      qualifiedQueues.sort((a: any, b: any) => {
        const timeA = a.queue_timestamp || ''
        const timeB = b.queue_timestamp || ''
        if (timeA !== timeB) return timeA.localeCompare(timeB)
        
        const slotA = a.slot_number ?? 0
        const slotB = b.slot_number ?? 0
        if (slotA !== slotB) return slotA - slotB
        
        return (a.id || '').localeCompare(b.id || '')
      })
      
      // ✨ Group by booking session
      const sessionMap = new Map<string, any[]>()
      qualifiedQueues.forEach((q: any) => {
        const sessionKey = `${q.queue_timestamp || 'no-timestamp'}`
        if (!sessionMap.has(sessionKey)) {
          sessionMap.set(sessionKey, [])
        }
        sessionMap.get(sessionKey)!.push(q)
      })
      
      const totalQuantity = Math.max(0, Number(session.total_quantity ?? 0))
      let allocatedSlotCount = 0

      // Add booked slots (all individual, but grouped by session)
      sessionMap.forEach((sessionQueues, sessionKey) => {
        const totalInSession = sessionQueues.length
        
        // Add ALL slots in the session with session metadata
        sessionQueues.forEach((q, slotIndexInSession) => {
          const isWaitlisted = allocatedSlotCount >= totalQuantity

          slots.push({
            id: `slot-${q.id}`,  // ✨ Use actual queue id
            type,
            ...itemConfig,
            assignedTo: q.display_name,
            uid: q.uid_game,
            queueId: q.id,
            requestedQty: q.requested_qty,
            receivedQty: q.received_qty,
            remainingQty: Math.max(q.requested_qty - q.received_qty, 0),
            status: q.status,
            isEmpty: false,
            isMe: q.uid_game === myProfile?.uid_game,
            slotIndex: q.slot_number || 1,
            // ✨ NEW: Booking session info
            bookingSessionSize: totalInSession,
            queueTimestamp: sessionKey,
            isFirstInSession: slotIndexInSession === 0,  // Mark first slot for header display
            isWaitlist: isWaitlisted
          })

          allocatedSlotCount++
        })
      })

      // Add empty slots (only for absolute coordinate mapping, we will hide them from the board layout)
      const emptyCount = Math.max(totalQuantity - allocatedSlotCount, 0)
      for (let i = 0; i < emptyCount; i++) {
        slots.push({
          id: `empty-${type}-${i}`,
          type,
          ...itemConfig,
          assignedTo: '--- ไม่มีใครจอง ---',
          uid: '',
          isMe: false,
          isEmpty: true,
          isWaitlist: false
        })
      }
    })

    // ✨ Assign absolute locked page and slot numbers to all slots
    const rawSlots = slots.map((s, index) => ({
      ...s,
      originalPage: Math.floor(index / 4) + 1,
      originalSlot: (index % 4) + 1
    }))

    // ✨ Filter for board: keep empty slots but hide waitlist slots from the live board slots view
    let boardSlots = rawSlots.filter(s => !s.isWaitlist)
    let waitlistSlots = rawSlots.filter(s => s.isWaitlist)

    // ✨ Filter by activeSubTab (condense empty/non-matching slots)
    if (activeSubTab !== 'all') {
      boardSlots = boardSlots.filter(s => s.type === activeSubTab)
      waitlistSlots = waitlistSlots.filter(s => s.type === activeSubTab)
    }

    if (DEBUG_AUCTION && typeof window !== 'undefined') {
      console.debug('[AuctionBoard] Slots mapped with booking sessions', {
        totalQueues: (memberQueues || []).length,
        boardSlotsCount: boardSlots.length,
        waitlistSlotsCount: waitlistSlots.length,
        slots: rawSlots
      })
    }

    return { boardSlots, waitlistSlots, rawSlots }
  }, [memberQueues, todayItems, activeSubTab, myProfile])

  const mappedSlots = boardSlots
  const slotsPerPage = 4
  const totalPages = Math.ceil(mappedSlots.length / slotsPerPage) || 1
  const currentSlots = mappedSlots.slice((currentPage - 1) * slotsPerPage, currentPage * slotsPerPage)

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/auction/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const newData = await response.json()
      if (newData.success) {
        setData(newData)
      }
    } catch (error) {
      console.error('Error refreshing auction data:', error)
    }
    await onRefresh?.()
    router.refresh()
  }

  const handleAdminSave = async (draftTotals?: Record<'Album' | 'Puppet' | 'White' | 'RedBlack', number | ''>) => {
    const missingLimits = (['Album', 'Puppet', 'White', 'RedBlack'] as const).filter(
      type => limits[type] === '' || limits[type] === null || limits[type] === undefined
    )
    if (missingLimits.length > 0) {
      alert(`กรุณาใส่ลิมิตต่อคนสำหรับ: ${missingLimits.join(', ')}`)
      return
    }

    if (!confirm('ยืนยันการบันทึกข้อมูล? ระบบจะเรียงคิวและแจกจ่ายสล็อตจริงให้ลูกกิลด์ตามยอดนี้')) return
    setIsSaving(true)

    const totals = {
      Album: draftTotals?.Album ?? positions.Album.total,
      Puppet: draftTotals?.Puppet ?? positions.Puppet.total,
      White: draftTotals?.White ?? positions.White.total,
      RedBlack: draftTotals?.RedBlack ?? positions.RedBlack.total,
    }

    const payload = [
      { item_type: 'Album' as const, total_quantity: Number(totals.Album) || 0, personal_limit: Number(limits.Album) },
      { item_type: 'Puppet' as const, total_quantity: Number(totals.Puppet) || 0, personal_limit: Number(limits.Puppet) },
      { item_type: 'White' as const, total_quantity: Number(totals.White) || 0, personal_limit: Number(limits.White) },
      { item_type: 'RedBlack' as const, total_quantity: Number(totals.RedBlack) || 0, personal_limit: Number(limits.RedBlack) },
    ]
    const res = await saveAuctionSession(payload)
    if (res.success) {
      setPositions(prev => ({
        Album: { ...prev.Album, total: Number(totals.Album) || 0 },
        Puppet: { ...prev.Puppet, total: Number(totals.Puppet) || 0 },
        White: { ...prev.White, total: Number(totals.White) || 0 },
        RedBlack: { ...prev.RedBlack, total: Number(totals.RedBlack) || 0 },
      }))
      alert('บันทึกและจัดคิวสำเร็จ!')
      await onRefresh?.()
    } else {
      alert('เกิดข้อผิดพลาด: ' + res.error)
    }
    setIsSaving(false)
  }

  return (
    <div className="w-full max-w-475 mx-auto grid grid-cols-1 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(320px,360px)] gap-6 items-start">
      <div className="w-full flex flex-col gap-3 sticky top-15">
        {isAdmin && <AdminLimits limits={limits} setLimits={setLimits} />}
      </div>

      <div className="w-full min-w-0">
        <AuctionWindow 
          isAdmin={isAdmin}
          limits={limits}
          positions={positions}
          history={history}
          memberQueues={memberQueues}
          mappedSlots={mappedSlots}
          waitlistSlots={waitlistSlots}
          rawSlots={rawSlots}
          todayItems={todayItems}
          activeSubTab={activeSubTab}
          setActiveSubTab={setActiveSubTab} 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          currentSlots={currentSlots} 
          onRefresh={handleRefresh}
          isSaving={isSaving} 
        />
      </div>

      {isAdmin && (
        <div className="w-full flex flex-col gap-4 sticky top-24">
          <AdminForm 
          positions={positions} 
          setPositions={setPositions} 
          onSave={handleAdminSave} 
          isSaving={isSaving} 
          onRefresh={handleRefresh}/>
        </div>
      )}
    </div>
  )
}