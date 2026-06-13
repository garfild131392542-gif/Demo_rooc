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
  
  // 🌟 ดึงค่าตั้งต้นจาก Database มาแสดงเป็นค่าเริ่มต้นให้แอดมิน
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
    // เติม ?. ตรงนี้
    todayItems?.forEach((item: any) => {
      if (item.item_name in init) (init as any)[item.item_name].total = item.total_quantity
    })
    return init
  })

  // 🌟 ลอจิกจัดสล็อตแบบ Live Preview (Real-time)
 const mappedSlots = useMemo(() => {
    let slots: any[] = []
    const priorityOrder: ('Album' | 'Puppet' | 'White' | 'RedBlack')[] = ['Album', 'Puppet', 'White', 'RedBlack']

    priorityOrder.forEach(type => {
      const session = (todayItems || []).find((s: any) => s.item_name === type)
      let availableStock = session ? Number(session.total_quantity) || 0 : 0
      const personalLimit = session ? Number(session.personal_limit) || 0 : 0

      if (availableStock <= 0) return

      // แนบตัวแปร allocated เพื่อจำว่าแจกไปกี่กล่องแล้ว
      const queues = (memberQueues  || []) 
        .filter((q: any) => q.item_type === type)
        .map((q: any) => {
          const remainingRequest = Math.max(q.requested_qty - q.received_qty, 0)
          const remainingLimit = Math.max(personalLimit - q.received_qty, 0)
          return {
            ...q,
            allocated: 0,
            maxAllocatable: Math.min(remainingRequest, remainingLimit)
          }
        })
        .filter((q: any) => q.maxAllocatable > 0)

      // Allocate grouped: give each queue up to its maxAllocatable in one block,
      // so a user's slots appear consecutively instead of round-robin.
      for (const queue of queues) {
        if (availableStock <= 0) break
        const remainingForQueue = Math.max(queue.maxAllocatable - (queue.allocated || 0), 0)
        const alloc = Math.min(availableStock, remainingForQueue)
        for (let i = 1; i <= alloc; i++) {
          const idx = (queue.allocated || 0) + i
          const isCompleted = idx <= queue.received_qty
          slots.push({
            id: `slot-${queue.id}-${idx}`,
            type,
            ...ITEM_CONFIG[type],
            assignedTo: queue.display_name,
            uid: queue.uid_game,
            queueId: queue.id,
            requestedQty: queue.requested_qty,
            receivedQty: queue.received_qty,
            status: queue.status,
            isCompleted: isCompleted,
            isEmpty: false,
            isMe: queue.uid_game === myProfile?.uid_game
          })
          availableStock--
        }
        queue.allocated = (queue.allocated || 0) + alloc
        availableStock -= alloc
      }

      for (let i = 0; i < availableStock; i++) {
        slots.push({
          id: `empty-${type}-${i}`,
          type, ...ITEM_CONFIG[type],
          assignedTo: '--- เปิดว่างให้กดอิสระ ---',
          uid: '', isMe: false, isEmpty: true
        })
      }
    })

    if (activeSubTab !== 'all') return slots.filter(s => s.type === activeSubTab)
    if (DEBUG_AUCTION && typeof window !== 'undefined') console.debug('[AuctionBoard] mappedSlots', slots)
    return slots
  }, [todayItems, memberQueues, activeSubTab, myProfile, isAdmin, limits, positions])

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
    // ตรวจสอบลิมิตต่อคน ว่างหรือไม่
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
          <AdminForm positions={positions} setPositions={setPositions} onSave={handleAdminSave} isSaving={isSaving} />
        </div>
      )}
    </div>
  )
}