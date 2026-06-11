'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { saveAuctionSession } from '@/app/actions/auction'
import { ITEM_CONFIG } from './constants'
import AuctionWindow from './AuctionWindow'
import AdminForm from './AdminForm'
import AdminLimits from './AdminLimits'

export default function AuctionBoard({ data, onRefresh }: { data: any; onRefresh?: () => void }) {
  const router = useRouter()
  const { isAdmin, todayItems, memberQueues, myProfile, history = [] } = data
  
  const [currentPage, setCurrentPage] = useState(1)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'Album' | 'Puppet' | 'White' | 'RedBlack'>('all')
  const [isSaving, setIsSaving] = useState(false)
  
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
      let availableStock = 0;
      let limit = 1;

      if (isAdmin) {
        availableStock = Number(positions[type].total) || 0;
        limit = Number(limits[type]) || 1;
      } else {
        // 🌟 ดักเผื่อ todayItems เป็น undefined
        const session = (todayItems || []).find((s: any) => s.item_name === type)
        if (session) {
          availableStock = session.total_quantity;
          limit = session.personal_limit;
        }
      }

      if (availableStock <= 0) return

      const queues = (memberQueues || []).filter((q: any) => q.item_type === type)

      queues.forEach((userQueue: any) => {
        if (availableStock <= 0) return
        const stillNeeds = userQueue.requested_qty - userQueue.received_qty
        const allocatedThisRound = Math.min(stillNeeds, limit, availableStock)

        for (let i = 0; i < allocatedThisRound; i++) {
          slots.push({
            id: `slot-${userQueue.id}-${type}-${i}`,
            type, ...ITEM_CONFIG[type],
            assignedTo: userQueue.display_name,
            uid: userQueue.uid_game,
            queueId: userQueue.id,
            requestedQty: userQueue.requested_qty,
            receivedQty: userQueue.received_qty,
            remainingQty: stillNeeds,
            status: userQueue.status,
            isMe: userQueue.uid_game === myProfile?.uid_game
          })
          availableStock--
        }
      })

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
    return slots
  }, [todayItems, memberQueues, activeSubTab, myProfile, isAdmin, limits, positions])

  const slotsPerPage = 4
  const totalPages = Math.ceil(mappedSlots.length / slotsPerPage) || 1
  const currentSlots = mappedSlots.slice((currentPage - 1) * slotsPerPage, currentPage * slotsPerPage)

  const handleRefresh = async () => {
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