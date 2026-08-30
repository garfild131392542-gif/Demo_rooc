'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveAuctionSession, getTodayAuctionDashboard, getAuctionHistory } from '@/app/actions/auction'
import { getGuildRoundsOverview } from '@/app/actions/auction-rounds'
import { createClient } from '@/lib/supabase/client'
import { ITEM_CONFIG } from './constants'
import AuctionWindow from './AuctionWindow'
import AdminForm from './AdminForm'
import AdminLimits from './AdminLimits'
import { useQuery } from '@tanstack/react-query'

export default function AuctionBoard({ data: initialData, onRefresh }: { data: any; onRefresh?: () => void }) {
  const router = useRouter()
  const { data, refetch } = useQuery({
    queryKey: ['auctionDashboard'],
    queryFn: async () => {
      const [dashboardResult, historyResult, roundsResult] = await Promise.all([
        getTodayAuctionDashboard(),
        getAuctionHistory(),
        getGuildRoundsOverview(),
      ])

      if (!dashboardResult.success) {
        throw new Error(dashboardResult.error || 'Failed to fetch dashboard data')
      }
      return {
        ...dashboardResult,
        history: historyResult.success ? historyResult.history : [],
        roundsData: roundsResult.success ? roundsResult : null,
      }
    },
    initialData,
    refetchInterval: false, // ⚡ Disable polling loop since Supabase Realtime WebSocket handles updates instantly!
    staleTime: 1000 * 60 * 3, // ⚡ 3 minutes in-memory cache for instant 0ms tab switching
    gcTime: 1000 * 60 * 10,
  })
  
  const { isAdmin, todayItems, memberQueues, myProfile, history = [], guildMembers = [], roundsData = null } = data
  
  const [currentPage, setCurrentPage] = useState(1)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'Album' | 'Puppet' | 'Feathers'>('all')
  const [isSaving, setIsSaving] = useState(false)
  // Debug flag to help trace slot generation in browser console when investigating UI issues
  const DEBUG_AUCTION = true
  
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

  // Sync state when todayItems changes (e.g. on mount, refetch, or save)
  useEffect(() => {
    if (todayItems && Array.isArray(todayItems)) {
      setLimits(prev => {
        const next = { ...prev }
        todayItems.forEach((item: any) => {
          if (item.item_name in next && (next as any)[item.item_name] === '') {
            (next as any)[item.item_name] = item.personal_limit
          }
        })
        return next
      })

      setPositions(prev => {
        const next = { ...prev }
        todayItems.forEach((item: any) => {
          if (item.item_name in next) {
            next[item.item_name as 'Album' | 'Puppet' | 'White' | 'RedBlack'] = {
              ...next[item.item_name as 'Album' | 'Puppet' | 'White' | 'RedBlack'],
              total: item.total_quantity
            }
          }
        })
        return next
      })
    }
  }, [todayItems])

  // ⚡ Supabase Realtime Channel: ซิงค์ข้อมูลข้ามเครื่องอัตโนมัติแบบ Live WebSocket (Debounced 200ms)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    const supabase = createClient()
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        refetch()
      }, 200)
    }

    const channel = supabase
      .channel('auction_realtime_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_rounds' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_round_members' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_round_transfers' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_round_logs' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_queues' }, debouncedRefetch)
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [refetch])



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

      // 🔍 ตรวจสอบ: ไอเทมนี้มี ACTIVE ROUND ใน roundsData หรือไม่?
      const activeRound = roundsData?.activeRounds?.find((r: any) => r.item_name === type && r.status === 'active')
      const roundMembers = activeRound 
        ? (roundsData?.activeRoundMembers || []).filter((rm: any) => rm.round_id === activeRound.id)
        : []

      const isRoundActive = Boolean(activeRound && roundMembers.length > 0)

      if (isRoundActive) {
        // 🌟 โหมดรอบการประมูล (Round Mode): จัดคิวตามลำดับสมาชิกที่ยังคงเหลือโควตาสำหรับวันนี้
        const totalQuantity = Math.max(0, Number(session.total_quantity ?? 0))
        let allocatedSlotCount = 0

        // รวบรวมยอดที่ได้รับ "เฉพาะในวันนี้" เพื่อให้ค้างสถานะ 'completed' บนผังของวันนี้
        const todayIsoDate = new Date().toISOString().split('T')[0]
        const todayLogs = roundsData?.todayLogs || []
        const todayReceivedMap: Record<string, number> = {}
        const todayUserReceivedMap: Record<string, number> = {}
        
        todayLogs.forEach((log: any) => {
          if (log.item_name === type) {
            if (log.round_member_id) {
              todayReceivedMap[log.round_member_id] = (todayReceivedMap[log.round_member_id] || 0) + (log.qty || 1)
            }
            if (log.target_user_id) {
              todayUserReceivedMap[log.target_user_id] = (todayUserReceivedMap[log.target_user_id] || 0) + (log.qty || 1)
            }
          }
        })

        // เสริมความแม่นยำจาก history ด้วย (กรณีมี log ในวันเดียวกัน)
        ;(data?.history || []).forEach((h: any) => {
          const hDate = h.awarded_at ? h.awarded_at.split('T')[0] : (h.created_at ? h.created_at.split('T')[0] : '')
          if (hDate === todayIsoDate && h.item_name === type) {
            if (h.round_member_id && !todayReceivedMap[h.round_member_id]) {
              todayReceivedMap[h.round_member_id] = (todayReceivedMap[h.round_member_id] || 0) + (h.awarded_qty || h.qty || 1)
            }
            if (h.user_id && !todayUserReceivedMap[h.user_id]) {
              todayUserReceivedMap[h.user_id] = (todayUserReceivedMap[h.user_id] || 0) + (h.awarded_qty || h.qty || 1)
            }
          }
        })

        const standardBaseQuota = (() => {
          if (!roundMembers || roundMembers.length === 0) return activeRound?.base_quota_per_member || 1
          const minQuota = Math.min(...roundMembers.map((m: any) => Number(m.base_quota) || 1))
          return minQuota || activeRound?.base_quota_per_member || 1
        })()

        // 🌟 สร้างรายการสล็อตแยกตาม Phase ความสำคัญ:
        // Phase 1: สล็อตสำหรับเคลียร์ยอดค้างรอบเก่า (Deficit) -> ได้รับสิทธิ์ก่อนเสมอ
        // Phase 2: สล็อตสำหรับโควตารอบใหม่ (New Round Quota) -> เรียงตามลำดับคิวของรอบใหม่
        type SlotCandidate = {
          member: any;
          profile: any;
          slotIndex: number;
          totalSlotsForUser: number;
          targetQuota: number;
          totalReceivedSoFar: number;
          isSlotCompleted: boolean;
          phase: number;
          queueOrder: number;
        }

        const slotCandidates: SlotCandidate[] = []

        roundMembers.forEach((member: any) => {
          const profile = member.profiles || {}
          const targetQuota = (member.base_quota || 0) + (member.transferred_in_quota || 0) - (member.transferred_out_quota || 0)
          const totalReceivedSoFar = member.received_qty || 0
          const receivedToday = todayReceivedMap[member.id] ?? todayUserReceivedMap[member.user_id] ?? 0
          
          // จำนวนที่ได้รับไปแล้วก่อนหน้าวันนี้
          const receivedBeforeToday = Math.max(0, totalReceivedSoFar - receivedToday)
          
          // โควตาที่ยังคงเหลือสำหรับวันนี้และอนาคต
          const remainingForTodayAndFuture = Math.max(0, targetQuota - receivedBeforeToday)

          // 🛑 ถ้าได้ครบตามโควตาไปแล้วในวันก่อนหน้า ให้ข้ามไป
          if (remainingForTodayAndFuture <= 0) {
            return
          }

          // สมาชิกคนนี้จะได้จัดสล็อตในวันนี้กี่ช่อง
          const slotsForUser = Math.min(remainingForTodayAndFuture, personalLimit || 2)
          const deficit = Math.max(0, (Number(member.base_quota) || standardBaseQuota) - standardBaseQuota)

          for (let s = 1; s <= slotsForUser; s++) {
            const itemIndexOverall = receivedBeforeToday + s
            // ถ้า itemIndexOverall <= deficit แปลว่าสล็อตนี้คือการเคลียร์ยอดค้างจากรอบเก่า (Phase 1)
            // ถ้าเกิน deficit แปลว่าสล็อตนี้คือโควตาของรอบใหม่ (Phase 2)
            const phase = itemIndexOverall <= deficit ? 1 : 2
            const isSlotCompleted = s <= receivedToday

            slotCandidates.push({
              member,
              profile,
              slotIndex: s,
              totalSlotsForUser: slotsForUser,
              targetQuota,
              totalReceivedSoFar,
              isSlotCompleted,
              phase,
              queueOrder: member.queue_order || 9999,
            })
          }
        })

        // จัดเรียงสล็อต: Phase 1 (เคลียร์ยอดค้างรอบเก่า) ขึ้นก่อน -> ตามด้วย Phase 2 (โควตารอบใหม่)
        slotCandidates.sort((a, b) => {
          if (a.phase !== b.phase) {
            return a.phase - b.phase
          }
          return a.queueOrder - b.queueOrder
        })

        slotCandidates.forEach((cand) => {
          const isWaitlisted = allocatedSlotCount >= totalQuantity
          const uniqueSlotQueueId = `round_${cand.member.id}_${cand.slotIndex}`

          slots.push({
            id: `round-slot-${cand.member.id}-${cand.slotIndex}`,
            type,
            ...itemConfig,
            assignedTo: cand.profile.display_name || `ตัวที่ ${cand.queueOrder}`,
            uid: cand.profile.uid_game || '',
            userId: cand.member.user_id,
            queueId: uniqueSlotQueueId,
            roundMemberId: cand.member.id,
            requestedQty: 1,
            receivedQty: cand.isSlotCompleted ? 1 : 0,
            remainingQty: cand.isSlotCompleted ? 0 : 1,
            accumulatedQuota: cand.targetQuota,
            accumulatedReceived: cand.totalReceivedSoFar,
            status: cand.isSlotCompleted ? 'completed' : 'waiting',
            isEmpty: false,
            isMe: cand.profile.uid_game === myProfile?.uid_game || cand.member.user_id === myProfile?.id,
            slotIndex: cand.slotIndex,
            bookingSessionSize: cand.totalSlotsForUser,
            queueTimestamp: `round-${activeRound.round_number}`,
            isFirstInSession: cand.slotIndex === 1,
            isWaitlist: isWaitlisted,
            roundNumber: activeRound.round_number,
            queueOrder: cand.queueOrder,
          })

          allocatedSlotCount++
        })

        // Add empty slots
        const emptyCount = Math.max(totalQuantity - allocatedSlotCount, 0)
        for (let i = 0; i < emptyCount; i++) {
          slots.push({
            id: `empty-${type}-${i}`,
            type,
            ...itemConfig,
            assignedTo: '--- สล็อตว่าง ---',
            uid: '',
            isMe: false,
            isEmpty: true,
            isWaitlist: false
          })
        }
      } else {
        // 🌟 โหมดสมาชิกจองเองปกติ (Self-Booking from auction_queues)
        const userTotalSlotsMap = new Map<string, number>()
        ;(queuesByType[type] || []).forEach((q: any) => {
          const key = q.user_id
          userTotalSlotsMap.set(key, (userTotalSlotsMap.get(key) ?? 0) + 1)
        })
        
        let shownCountPerUser = new Map<string, number>()
        const qualifiedQueues = (queuesByType[type] || []).filter((q: any) => {
          const totalSlots = userTotalSlotsMap.get(q.user_id) ?? 0
          const alreadyShown = shownCountPerUser.get(q.user_id) ?? 0
          const shouldShow = alreadyShown < personalLimit
          
          if (shouldShow) {
            shownCountPerUser.set(q.user_id, alreadyShown + 1)
          }
          
          return shouldShow
        })
        
        const userBookingGroups = new Map<string, any[]>()
        qualifiedQueues.forEach((q: any) => {
          const groupKey = `${q.user_id || q.uid_game || q.display_name}_${q.queue_timestamp || 'no-ts'}`
          if (!userBookingGroups.has(groupKey)) {
            userBookingGroups.set(groupKey, [])
          }
          userBookingGroups.get(groupKey)!.push(q)
        })

        userBookingGroups.forEach((group) => {
          group.sort((a, b) => {
            if ((a.slot_number ?? 0) !== (b.slot_number ?? 0)) {
              return (a.slot_number ?? 0) - (b.slot_number ?? 0)
            }
            return String(a.id || '').localeCompare(String(b.id || ''))
          })
        })

        const sortedUserGroups = Array.from(userBookingGroups.values()).sort((groupA, groupB) => {
          const firstA = groupA[0]
          const firstB = groupB[0]
          const timeA = firstA.queue_timestamp || ''
          const timeB = firstB.queue_timestamp || ''
          if (timeA !== timeB) return timeA.localeCompare(timeB)
          return (firstA.id || '').localeCompare(firstB.id || '')
        })

        const totalQuantity = Math.max(0, Number(session.total_quantity ?? 0))
        let allocatedSlotCount = 0

        sortedUserGroups.forEach((sessionQueues) => {
          const totalInSession = sessionQueues.length
          const sessionKey = sessionQueues[0]?.queue_timestamp || 'no-timestamp'
          
          sessionQueues.forEach((q, slotIndexInSession) => {
            const isWaitlisted = allocatedSlotCount >= totalQuantity

            slots.push({
              id: `slot-${q.id}`,
              type,
              ...itemConfig,
              assignedTo: q.display_name,
              uid: q.uid_game,
              userId: q.user_id,
              queueId: q.id,
              requestedQty: q.requested_qty,
              receivedQty: q.received_qty,
              remainingQty: Math.max(q.requested_qty - q.received_qty, 0),
              status: q.status,
              isEmpty: false,
              isMe: q.uid_game === myProfile?.uid_game,
              slotIndex: q.slot_number || 1,
              bookingSessionSize: totalInSession,
              queueTimestamp: sessionKey,
              isFirstInSession: slotIndexInSession === 0,
              isWaitlist: isWaitlisted
            })

            allocatedSlotCount++
          })
        })

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
      }
    })

    // ✨ Filter for board: keep empty slots but hide waitlist slots from the live board slots view
    let boardSlots = slots.filter(s => !s.isWaitlist)
    let waitlistSlots = slots.filter(s => s.isWaitlist)

    // ✨ Assign absolute locked page and slot numbers to board slots (since waitlist slots are not on the board)
    boardSlots = boardSlots.map((s, index) => ({
      ...s,
      originalPage: Math.floor(index / 4) + 1,
      originalSlot: (index % 4) + 1
    }))

    const rawSlots = [...boardSlots, ...waitlistSlots]

    // ✨ Filter by activeSubTab (condense empty/non-matching slots)
    if (activeSubTab !== 'all') {
      if (activeSubTab === 'Feathers') {
        boardSlots = boardSlots.filter(s => s.type === 'White' || s.type === 'RedBlack')
        waitlistSlots = waitlistSlots.filter(s => s.type === 'White' || s.type === 'RedBlack')
      } else {
        boardSlots = boardSlots.filter(s => s.type === activeSubTab)
        waitlistSlots = waitlistSlots.filter(s => s.type === activeSubTab)
      }
    }

    return { boardSlots, waitlistSlots, rawSlots }
  }, [memberQueues, todayItems, activeSubTab, myProfile, roundsData])

  const mappedSlots = boardSlots
  const slotsPerPage = 4
  const totalPages = Math.ceil(mappedSlots.length / slotsPerPage) || 1
  const currentSlots = mappedSlots.slice((currentPage - 1) * slotsPerPage, currentPage * slotsPerPage)

  const handleRefresh = async () => {
    await Promise.all([
      refetch(),
      onRefresh ? onRefresh() : Promise.resolve(),
    ])
  }

  const handleAdminSave = async () => {
    const missingLimits = (['Album', 'Puppet', 'White', 'RedBlack'] as const).filter(
      type => limits[type] === '' || limits[type] === null || limits[type] === undefined
    )
    if (missingLimits.length > 0) {
      alert(`กรุณาใส่ลิมิตต่อคนสำหรับ: ${missingLimits.join(', ')}`)
      return
    }

    if (!confirm('ยืนยันการบันทึกข้อมูล? ระบบจะเรียงคิวและแจกจ่ายสล็อตจริงให้ลูกกิลด์ตามยอดนี้')) return
    setIsSaving(true)

    try {
      const payload = [
        { item_type: 'Album' as const, total_quantity: Number(positions.Album.total) || 0, personal_limit: Number(limits.Album) },
        { item_type: 'Puppet' as const, total_quantity: Number(positions.Puppet.total) || 0, personal_limit: Number(limits.Puppet) },
        { item_type: 'White' as const, total_quantity: Number(positions.White.total) || 0, personal_limit: Number(limits.White) },
        { item_type: 'RedBlack' as const, total_quantity: Number(positions.RedBlack.total) || 0, personal_limit: Number(limits.RedBlack) },
      ]
      const res = await saveAuctionSession(payload)
      if (res.success) {
        alert('บันทึกและจัดคิวสำเร็จ!')
        await refetch()
        await onRefresh?.()
        router.refresh()
      } else {
        alert('เกิดข้อผิดพลาด: ' + res.error)
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const [viewMode, setViewMode] = useState<"slots" | "history" | "queue" | "summary" | "proxy" | "rounds">("slots")

  return (
    <div className="w-full max-w-475 mx-auto grid grid-cols-1 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(320px,360px)] gap-6 items-start pb-16">
      {isAdmin && (
        <div className={`w-full flex-col gap-3 sticky top-15 ${viewMode === 'slots' ? 'flex' : 'hidden xl:flex'}`}>
          <AdminLimits limits={limits} setLimits={setLimits} />
        </div>
      )}

      <div className="w-full min-w-0">
        <AuctionWindow 
          viewMode={viewMode}
          setViewMode={setViewMode}
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
          guildMembers={guildMembers}
          roundsOverview={roundsData}
          onRefresh={handleRefresh}
          isSaving={isSaving} 
        />
      </div>

      {isAdmin && (
        <div className={`w-full flex-col gap-4 sticky top-24 ${viewMode === 'slots' ? 'flex' : 'hidden xl:flex'}`}>
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