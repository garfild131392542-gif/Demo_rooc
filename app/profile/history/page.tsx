import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const sessionAny = session as any
  const userId = sessionAny.user?.id ?? sessionAny.id

  const supabase = await createClient()

  // 1. ดึงข้อมูล Profile ของผู้ใช้ปัจจุบัน
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile) {
    return <div className="p-8 text-red-500">ไม่พบข้อมูลโปรไฟล์ผู้ใช้</div>
  }

  // 2. ดึงประวัติการจองคิวทั้งหมดของทุกคนในกิลด์ (เพื่อแสดงผลรวมของทุกคนในกิลด์)
  let userQueues: any[] = []
  const memberMap = new Map<string, { display_name: string; uid_game: string }>()

  if (profile.guild_id) {
    const { data: guildQueues, error: queueError } = await supabase
      .from('auction_queues')
      .select('*')
      .eq('guild_id', profile.guild_id)
      .order('queue_timestamp', { ascending: true })

    if (queueError) {
      console.error('Fetch guild queues error:', queueError.message)
    } else {
      userQueues = guildQueues || []
    }

    // 2.2 ดึงประวัติการมอบรางวัลจากระบบรอบ (auction_round_logs)
    const { data: roundLogs, error: roundLogsError } = await (supabase as any)
      .from('auction_round_logs')
      .select('*')
      .eq('guild_id', profile.guild_id)
      .gt('qty', 0)
      .order('created_at', { ascending: false })

    if (roundLogsError) {
      console.warn('Fetch round logs warning:', roundLogsError.message)
    }

    // 2.3 ดึงประวัติการมอบรางวัลจากระบบคลาสสิก (auction_history)
    const { data: legacyHistory, error: legacyError } = await (supabase as any)
      .from('auction_history')
      .select('*')
      .eq('guild_id', profile.guild_id)
      .order('awarded_at', { ascending: false })

    if (legacyError) {
      console.warn('Fetch legacy auction history warning:', legacyError.message)
    }

    // ดึงโปรไฟล์ทั้งหมดในกิลด์เพื่อนำมาจับคู่ชื่อและไอดีเกม
    const { data: guildMembers } = await supabase
      .from('profiles')
      .select('id, display_name, uid_game')
      .eq('guild_id', profile.guild_id)

    guildMembers?.forEach((m: any) => {
      memberMap.set(m.id, {
        display_name: m.display_name || m.uid_game || 'ไม่ทราบชื่อ',
        uid_game: m.uid_game || ''
      })
    })

    // 2.4 จัดรูปแบบ round logs ให้เป็น Queue items
    const formattedRoundLogs = (roundLogs || []).map((log: any) => {
      const userMeta = memberMap.get(log.target_user_id)
      const displayName = userMeta?.display_name || 'สมาชิกในกิลด์'
      return {
        id: `roundlog_${log.id}`,
        user_id: log.target_user_id,
        item_name: log.item_name,
        requested_qty: log.qty || 1,
        received_qty: log.qty || 1,
        calculated_status: 'completed',
        queue_timestamp: log.created_at,
        slot_range: log.note || `รอบที่ ${log.round_number}`,
        position_text: `ประมูลรอบที่ ${log.round_number}`,
        display_name: displayName,
      }
    })

    const rawRoundLogs = (roundLogs || []).map((log: any) => ({
      id: `roundlog_${log.id}`,
      user_id: log.target_user_id,
      display_name: memberMap.get(log.target_user_id)?.display_name || 'สมาชิกในกิลด์',
      item_name: log.item_name,
      requested_qty: log.qty || 1,
      received_qty: log.qty || 1,
      calculated_status: 'completed',
      queue_timestamp: log.created_at,
    }))

    // 2.5 จัดรูปแบบ legacy history ให้เป็น Queue items
    const formattedLegacy = (legacyHistory || []).map((h: any) => {
      const userMeta = memberMap.get(h.user_id)
      const displayName = userMeta?.display_name || 'สมาชิกในกิลด์'
      return {
        id: `history_${h.id}`,
        user_id: h.user_id,
        item_name: h.item_name,
        requested_qty: h.requested_qty || h.awarded_qty || 1,
        received_qty: h.awarded_qty || 1,
        calculated_status: 'completed',
        queue_timestamp: h.awarded_at || h.created_at,
        slot_range: h.note || 'ประมูลสำเร็จ',
        position_text: 'ประมูลสำเร็จ',
        display_name: displayName,
      }
    })

    const rawLegacy = (legacyHistory || []).map((h: any) => ({
      id: `history_${h.id}`,
      user_id: h.user_id,
      display_name: memberMap.get(h.user_id)?.display_name || 'สมาชิกในกิลด์',
      item_name: h.item_name,
      requested_qty: h.requested_qty || h.awarded_qty || 1,
      received_qty: h.awarded_qty || 1,
      calculated_status: 'completed',
      queue_timestamp: h.awarded_at || h.created_at,
    }))

    // 3. ดึงคิววันนี้และเซสชันวันนี้ของกิลด์เพื่อใช้คำนวณตำแหน่ง (Page/Slot) และ waitlist
    const today = new Date().toISOString().split('T')[0]
    let todaySessions: any[] = []
    let todayQueues: any[] = []

    const { data: sessions } = await supabase
      .from('auction_sessions')
      .select('item_name, total_quantity, personal_limit')
      .eq('guild_id', profile.guild_id)
      .eq('session_date', today)
      .eq('status', 'active')
    
    if (sessions) todaySessions = sessions

    const { data: queues } = await supabase
      .from('auction_queues')
      .select('id, item_name, user_id, status, queue_timestamp, slot_number')
      .eq('guild_id', profile.guild_id)
      .in('status', ['waiting', 'partial', 'completed'])

    if (queues) todayQueues = queues

    // คำนวณหาคิวที่เป็น waitlist และตำแหน่ง (Page/Slot) ในวันนี้
    const waitlistQueueIds = new Set<string>()
    const qualifiedQueueIds = new Set<string>()
    const queuePositions = new Map<string, { page: number; slot: number }>()

    if (todaySessions.length > 0 && todayQueues.length > 0) {
      todaySessions.forEach((session: any) => {
        const itemType = session.item_name
        const totalQuantity = session.total_quantity
        const personalLimit = session.personal_limit

        const itemQueues = todayQueues.filter((q: any) => q.item_name === itemType)

        // กรองยอดจำกัดโควตาส่วนบุคคล
        const shownCountPerUser = new Map<string, number>()
        const qualified = itemQueues.filter((q: any) => {
          const alreadyShown = shownCountPerUser.get(q.user_id) ?? 0
          const shouldShow = alreadyShown < personalLimit
          if (shouldShow) {
            shownCountPerUser.set(q.user_id, alreadyShown + 1)
            qualifiedQueueIds.add(q.id)
          }
          return shouldShow
        })

        // เรียงลำดับเหมือนกระดานบอร์ด
        qualified.sort((a: any, b: any) => {
          const timeA = a.queue_timestamp || ''
          const timeB = b.queue_timestamp || ''
          if (timeA !== timeB) return timeA.localeCompare(timeB)

          const slotA = a.slot_number ?? 0
          const slotB = b.slot_number ?? 0
          if (slotA !== slotB) return slotA - slotB

          return (a.id || '').localeCompare(b.id || '')
        })

        // บันทึกตำแหน่ง หน้า และ ช่อง
        qualified.forEach((q: any, index: number) => {
          const page = Math.floor(index / 4) + 1
          const slot = (index % 4) + 1
          queuePositions.set(q.id, { page, slot })
        })

        // คิวที่อยู่ลำดับเกิน totalQuantity คือ waitlist
        qualified.slice(totalQuantity).forEach((q: any) => {
          waitlistQueueIds.add(q.id)
        })
      })
    }

    // จัดกลุ่มและคำนวณสถานะ
    const processedQueues = (userQueues || [])
      .filter((q: any) => {
        if (q.status === 'waiting') {
          const hasSession = todaySessions.some((s: any) => s.item_name === q.item_name)
          if (hasSession) {
            return qualifiedQueueIds.has(q.id)
          }
        }
        return true
      })
      .map((q: any) => {
        let finalStatus = q.status
        if (q.status === 'waiting' && waitlistQueueIds.has(q.id)) {
          finalStatus = 'waitlist'
        }
        const userMeta = memberMap.get(q.user_id)
        const displayName = userMeta?.display_name || 'ไม่ทราบชื่อ'
        return {
          ...q,
          calculated_status: finalStatus,
          display_name: displayName
        }
      })

    // จัดกลุ่มจองตามเวลา, ไอเทม และสถานะ (ดึงเป็นผลรวมตามช่วงเวลาของการจอง)
    const groups: Record<string, any> = {}

    processedQueues.forEach((q: any) => {
      // 💡 จัดกลุ่มตาม user_id, queue_timestamp, item_name, และ calculated_status ป้องกันการปนกันของสมาชิกคนละคน
      const key = `${q.user_id}_${q.queue_timestamp}_${q.item_name}_${q.calculated_status}`
      const pos = queuePositions.get(q.id)
      const userMeta = memberMap.get(q.user_id)
      const displayName = userMeta?.display_name || 'ไม่ทราบชื่อ'

      if (!groups[key]) {
        groups[key] = {
          user_id: q.user_id,
          queue_timestamp: q.queue_timestamp,
          item_name: q.item_name,
          calculated_status: q.calculated_status,
          requested_qty: 0,
          received_qty: 0,
          slot_numbers: [] as number[],
          positions: [] as { page: number; slot: number }[],
          display_name: displayName,
        }
      }

      groups[key].requested_qty += q.requested_qty
      groups[key].received_qty += q.received_qty
      groups[key].slot_numbers.push(q.slot_number)
      if (pos) {
        groups[key].positions.push(pos)
      }
    })

    // แปลงจาก Object กลุ่มเป็นอาเรย์ และคำนวณ Range
    const groupedQueues = Object.values(groups).map((group: any, index: number) => {
      group.slot_numbers.sort((a: number, b: number) => a - b)
      const minSlot = group.slot_numbers[0]
      const maxSlot = group.slot_numbers[group.slot_numbers.length - 1]
      const slotRange = minSlot === maxSlot ? `#${minSlot}` : `#${minSlot} - #${maxSlot}`

      let positionText = "-"
      if (group.positions.length > 0) {
        group.positions.sort((a: any, b: any) => {
          if (a.page !== b.page) return a.page - b.page
          return a.slot - b.slot
        })
        const firstPos = group.positions[0]
        const lastPos = group.positions[group.positions.length - 1]

        if (group.positions.length === 1) {
          positionText = `หน้า ${firstPos.page} ช่องที่ ${firstPos.slot}`
        } else {
          positionText = `หน้า ${firstPos.page} ช่องที่ ${firstPos.slot} ถึง หน้า ${lastPos.page} ช่องที่ ${lastPos.slot}`
        }
      }

      return {
        id: `${group.queue_timestamp}_${group.item_name}_${index}`,
        user_id: group.user_id,
        item_name: group.item_name,
        requested_qty: group.requested_qty,
        received_qty: group.received_qty,
        calculated_status: group.calculated_status,
        queue_timestamp: group.queue_timestamp,
        slot_range: slotRange,
        position_text: positionText,
        display_name: group.display_name,
      }
    })

    // รวมทั้งประวัติคิวปกติ + ประวัติการมอบรางวัลจากระบบรอบ + ประวัติการประมูลสำเร็จทั้งหมด
    const allRawQueues = [...processedQueues, ...rawRoundLogs, ...rawLegacy]
    const allInitialQueues = [...groupedQueues, ...formattedRoundLogs, ...formattedLegacy].sort((a, b) => {
      const timeA = new Date(a.queue_timestamp || 0).getTime()
      const timeB = new Date(b.queue_timestamp || 0).getTime()
      return timeB - timeA
    })

    return (
      <div className="w-full mx-auto px-2 sm:px-4 py-4 md:py-6 h-[calc(100vh-4.5rem)] overflow-hidden flex flex-col">
        <HistoryClient 
          initialQueues={allInitialQueues} 
          rawQueues={allRawQueues} 
          currentUserId={userId}
          currentUserDisplayName={profile.display_name || profile.uid_game || 'คุณ'}
        />
      </div>
    )
  }

  return (
    <div className="w-full mx-auto px-2 sm:px-4 py-4 md:py-6 h-[calc(100vh-4.5rem)] overflow-hidden flex flex-col">
      <HistoryClient 
        initialQueues={[]} 
        rawQueues={[]} 
        currentUserId={userId}
        currentUserDisplayName={profile.display_name || profile.uid_game || 'คุณ'}
      />
    </div>
  )
}
