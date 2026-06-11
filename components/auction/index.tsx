'use client'

import { useState, useMemo } from 'react'
import { joinAuctionQueue, saveAuctionSession } from '@/app/actions/auction'
import { ITEM_CONFIG } from './constants'
import AuctionWindow from './AuctionWindow'
import MemberForm from './MemberForm'
import AdminForm from './AdminForm'
import AdminLimits from './AdminLimits'

export default function AuctionBoard({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const { isAdmin, todayItems, memberQueues, myProfile } = data
  
  const [currentPage, setCurrentPage] = useState(1)
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'Album' | 'Puppet' | 'White' | 'RedBlack'>('all')
  const [reqQty, setReqQty] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  
  // 🌟 ดึงค่าตั้งต้นจาก Database มาแสดงเป็นค่าเริ่มต้นให้แอดมิน
  const [limits, setLimits] = useState(() => {
    const init = { Album: 1, Puppet: 2, White: 10, RedBlack: 10 }
    // เติม ?. ตรงนี้ เพื่อบอกว่าถ้า todayItems มีค่า ค่อย .forEach
    todayItems?.forEach((item: any) => {
      if (item.item_name in init) (init as any)[item.item_name] = item.personal_limit
    })
    return init
  })

  const [positions, setPositions] = useState(() => {
    const init = {
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
        availableStock = positions[type].total;
        limit = limits[type];
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

  const handleMemberRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeSubTab === 'all') return alert('กรุณาเลือกประเภทไอเทมที่ต้องการจองก่อนครับ')
    setIsSaving(true)
    const res = await joinAuctionQueue(activeSubTab as any, reqQty)
    if (res.success) { alert('ลงทะเบียนจองคิวสำเร็จ!'); onRefresh() }
    else { alert('เกิดข้อผิดพลาด: ' + res.error) }
    setIsSaving(false)
  }

  const handleAdminSave = async () => {
    if (!confirm('ยืนยันการบันทึกข้อมูล? ระบบจะเรียงคิวและแจกจ่ายสล็อตจริงให้ลูกกิลด์ตามยอดนี้')) return
    setIsSaving(true)
    const payload = [
      { item_type: 'Album' as const, total_quantity: positions.Album.total, personal_limit: limits.Album },
      { item_type: 'Puppet' as const, total_quantity: positions.Puppet.total, personal_limit: limits.Puppet },
      { item_type: 'White' as const, total_quantity: positions.White.total, personal_limit: limits.White },
      { item_type: 'RedBlack' as const, total_quantity: positions.RedBlack.total, personal_limit: limits.RedBlack },
    ]
    const res = await saveAuctionSession(payload)
    if (res.success) { alert('บันทึกและจัดคิวสำเร็จ!'); onRefresh() }
    else { alert('เกิดข้อผิดพลาด: ' + res.error) }
    setIsSaving(false)
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-6 items-start">
      <div className="w-full xl:w-[320px] shrink-0 flex flex-col gap-6 sticky top-24">
        <MemberForm activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} reqQty={reqQty} setReqQty={setReqQty} handleMemberRegister={handleMemberRegister} isSaving={isSaving} />
        {isAdmin && <AdminLimits limits={limits} setLimits={setLimits} />}
      </div>

      <div className="w-full xl:flex-1 min-w-0">
        <AuctionWindow 
          isAdmin={isAdmin}
          limits={limits}
          positions={positions}
          todayItems={todayItems} mappedSlots={mappedSlots} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} 
          currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} currentSlots={currentSlots} 
          onRefresh={onRefresh} isSaving={isSaving} 
        />
      </div>

      {isAdmin && (
        <div className="w-full xl:w-[380px] shrink-0 sticky top-24">
          <AdminForm positions={positions} setPositions={setPositions} onSave={handleAdminSave} isSaving={isSaving} />
        </div>
      )}
    </div>
  )
}