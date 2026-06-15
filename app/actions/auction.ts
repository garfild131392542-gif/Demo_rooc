'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export type ItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

// 1. แอดมินบันทึกของรางวัลรายวัน
export async function saveAuctionSession(items: { item_type: ItemType; total_quantity: number; personal_limit: number }[]) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // ลบข้อมูลของวันนี้เก่าออกก่อน (ป้องกันกรอกซ้ำ)
    await supabase
      .from('auction_sessions')
      .delete()
      .eq('guild_id', session.profile.guild_id)
      .eq('session_date', today)

    // บันทึกของรางวัลใหม่
    const insertData = items.map((item, index) => ({
      guild_id: session.profile.guild_id,
      session_date: today,
      item_name: item.item_type,
      total_quantity: item.total_quantity,
      personal_limit: item.personal_limit,
      item_priority: index + 1,
      status: 'active'
    }))

    const { error } = await supabase.from('auction_sessions').insert(insertData as any)
    if (error) throw error

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

async function getAuctionSessionPersonalLimit(supabase: any, guildId: string, itemType: ItemType) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('auction_sessions')
    .select('personal_limit')
    .eq('guild_id', guildId)
    .eq('item_name', itemType)
    .eq('session_date', today)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data?.personal_limit ?? null
}

// 2. สมาชิกจองคิว - ✨ ใหม่: สร้าง multiple rows (1 per slot) แทนที่ 1 row กับ requested_qty=N
export async function joinAuctionQueue(itemType: ItemType, requestedQty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()

    // ✨ หา slot_number สูงสุดที่มีอยู่สำหรับ user นี้ + item type นี้
    const { data: existingSlots } = await supabase
      .from('auction_queues')
      .select('slot_number' as any)
      .eq('user_id', session.profile.id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])
      .order('slot_number' as any, { ascending: false })
      .limit(1)

    const maxSlotNumber = ((existingSlots as any)?.[0]?.slot_number ?? 0) as number

    // ✨ สร้าง N rows โดยแต่ละ row เป็น 1 slot (requested_qty = 1)
    const newSlots = Array.from({ length: requestedQty }, (_, i) => ({
      guild_id: session.profile.guild_id,
      user_id: session.profile.id,
      item_name: itemType,
      requested_qty: 1,  // ✨ ต่อ slot = 1 สล็อต
      received_qty: 0,
      status: 'waiting',
      slot_number: maxSlotNumber + i + 1,  // ✨ slot_number: maxSlot+1, maxSlot+2, ...
      queue_timestamp: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('auction_queues')
      .insert(newSlots as any)

    if (insertError) throw insertError

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Batch join multiple items ✨ ใหม่: สร้าง N rows per item
export async function joinAuctionQueues(items: { itemType: ItemType; qty: number }[]) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()
    const inserts: any[] = []

    // ✨ สำหรับแต่ละ item type ให้ หา max slot_number แล้ว สร้าง N rows ใหม่
    for (const { itemType, qty } of items) {
      // หา slot_number สูงสุด
      const { data: existingSlots } = await supabase
        .from('auction_queues')
        .select('slot_number' as any)
        .eq('user_id', session.profile.id)
        .eq('item_name', itemType)
        .in('status', ['waiting', 'partial', 'completed'])
        .order('slot_number' as any, { ascending: false })
        .limit(1)

      const maxSlotNumber = ((existingSlots as any)?.[0]?.slot_number ?? 0) as number

      // ✨ สร้าง qty rows ใหม่ (แต่ละ row = 1 slot)
      for (let i = 0; i < qty; i++) {
        inserts.push({
          guild_id: session.profile.guild_id,
          user_id: session.profile.id,
          item_name: itemType,
          requested_qty: 1,  // ✨ ต่อ slot = 1
          received_qty: 0,
          status: 'waiting',
          slot_number: maxSlotNumber + i + 1,  // ✨ sequential slot numbers
          queue_timestamp: new Date().toISOString()
        })
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('auction_queues').insert(inserts as any)
      if (error) throw error
    }

    revalidatePath('/')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 3. ดึงข้อมูลทั้งหมดมาแสดงผล
export async function getTodayAuctionDashboard() {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0] // ได้ฟอร์แมต YYYY-MM-DD ของวันนี้

    // ดึงเซสชันไอเทมที่แอดมินตั้งค่าเปิดประมูลในวันนี้
    const { data: todayItems } = await supabase
      .from('auction_sessions')
      .select('*')
      .eq('guild_id', session.profile.guild_id)
      .eq('session_date', today)
      .order('item_priority', { ascending: true })

    // ดึงคิวทั้งหมดที่ยังอยู่ในระบบคิวหลัก
    const { data: rawQueues } = await supabase
      .from('auction_queues')
      .select('*, profiles:user_id(display_name, uid_game)')
      .eq('guild_id', session.profile.guild_id)
      .in('status', ['waiting', 'partial', 'completed'])
      .order('queue_timestamp', { ascending: true })

    // 🌟 พระเอกของงาน: กรองแยกประวัติวันเก่าออกจากวันปัจจุบัน
    const processedQueues = (rawQueues || [])
      .filter((q: any) => {
        // เงื่อนไขที่ 1: ถ้ายังค้างสถานะรอ (waiting) -> ให้แสดงผลต่อได้เลย ไม่ว่าจะจองมาวันไหน (ทบยอดข้ามวัน)
        if (q.status === 'waiting') return true;

        // เงื่อนไขที่ 2: ถ้าได้รับของไปแล้ว (completed / partial) -> จะแสดงบนกระดานนี้ได้ ต้องเป็นคิวของ "วันนี้" เท่านั้น
        const queueDate = q.updated_at ? q.updated_at.split('T')[0] : (q.queue_timestamp ? q.queue_timestamp.split('T')[0] : '');
        return queueDate === today;
      })
      .map((q: any) => ({
        id: q.id,
        user_id: q.user_id,
        display_name: q.profiles?.display_name || 'ไม่ทราบชื่อ',
        uid_game: q.profiles?.uid_game || '-',
        item_type: q.item_name,
        requested_qty: q.requested_qty,
        received_qty: q.received_qty,
        status: q.status,
        queue_timestamp: q.queue_timestamp
      }))

    return {
      success: true,
      isAdmin: session.profile.role === 'admin',
      myProfile: { display_name: session.profile.display_name, uid_game: session.profile.uid_game },
      todayItems: todayItems || [],
      memberQueues: processedQueues
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getAuctionHistory() {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'Not authenticated' }

    const supabase = await createClient()
    const { data: rawHistory, error } = await supabase
      .from('auction_history')
      .select('*, profiles:user_id(display_name, uid_game)')
      .eq('guild_id', session.profile.guild_id)
      .order('awarded_at', { ascending: false })

    if (error) throw error

    const history = (rawHistory || []).map((record: any) => ({
      ...record,
      display_name: record.profiles?.display_name || 'ไม่ทราบชื่อ',
      uid_game: record.profiles?.uid_game || '-',
    }))

    return { success: true, history }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function awardAuctionQueue(queueId: string | number, awardQty: number, note?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const { data: queue, error: fetchError } = await supabase
      .from('auction_queues')
      .select('*')
      .eq('id', String(queueId))
      .single()

    if (fetchError) throw fetchError
    if (!queue) return { success: false, error: 'ไม่พบรายการคิว' }
    if (queue.guild_id !== session.profile.guild_id) {
      return { success: false, error: 'ไม่สามารถจัดการคิวข้ามกิลด์ได้' }
    }

    // ดึงค่าลิมิตส่วนบุคคลของไอเทมชิ้นนี้ในเซสชันวันนี้
    const personalLimit = await getAuctionSessionPersonalLimit(supabase, session.profile.guild_id, queue.item_name as ItemType)
    if (personalLimit === null) {
      return { success: false, error: 'ไม่พบรายการประมูลสำหรับไอเท็มนี้ในวันนี้' }
    }

    // ดึงคิวประมูลทั้งหมดของยูสเซอร์คนนี้
    const { data: userQueues } = await supabase
      .from('auction_queues')
      .select('id, received_qty, status, updated_at, queue_timestamp')
      .eq('user_id', String(queue.user_id))
      .eq('item_name', String(queue.item_name))
      .in('status', ['waiting', 'partial', 'completed'])

    const today = new Date().toISOString().split('T')[0]

    // 🌟 คำนวณยอดที่เคยได้รับไปแล้วสำเร็จ "เฉพาะของวันนี้เท่านั้น" (กรองด้วยเวลาปัจจุบัน)
    const receivedTodayBefore = userQueues
      ?.filter(q => q.id !== queue.id && q.status === 'completed')
      .filter(q => {
        // ยึดวันที่อัปเดตล่าสุดเป็นหลัก ถ้าไม่มีให้ถอยไปเช็คเวลาสร้างคิว
        const targetDate = q.updated_at ? q.updated_at.split('T')[0] : (q.queue_timestamp ? q.queue_timestamp.split('T')[0] : '');
        return targetDate === today;
      })
      .reduce((sum, q) => sum + (q.received_qty || 0), 0) || 0

    // เซฟตี้ด่าน 1: ถ้าวันนี้เขารับไปจนครบโควตาก่อนหน้านี้แล้ว ให้กวาดล้างคิวรอที่เหลือทิ้งและแจ้งเตือน
    if (receivedTodayBefore >= personalLimit) {
        const waitingIds = userQueues?.filter(q => q.status === 'waiting').map(q => q.id) || []
        if (waitingIds.length > 0) {
           await supabase.from('auction_queues').delete().in('id', waitingIds)
        }
        return { success: false, error: `วันนี้สมาชิกได้รับครบโควตา ${personalLimit} ชิ้นแล้ว ระบบลบคิวส่วนเกินให้แล้วครับ` }
    }

    // อัปเดตคิวปัจจุบันแสตมป์สถานะสำเร็จ
    const { error: updateError } = await supabase
      .from('auction_queues')
      .update({ 
        received_qty: 1, 
        status: 'completed', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', String(queueId))

    if (updateError) throw updateError

    // 🌟 เช็คยอดรวมในวันนี้หลังแจกชิ้นนี้ไป: ถ้าครบโควตาของวันนี้พอดี -> สั่งทำลาย (DELETE) คิว waiting ที่เหลือทิ้งทันที!
    const totalNow = receivedTodayBefore + 1
    if (totalNow >= personalLimit) {
        const remainingWaitingIds = userQueues
          ?.filter(q => q.id !== queue.id && q.status === 'waiting')
          .map(q => q.id) || []

        if (remainingWaitingIds.length > 0) {
           await supabase
             .from('auction_queues')
             .delete()
             .in('id', remainingWaitingIds)
        }
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function skipAuctionQueue(queueId: string | number) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const { data: queue, error: fetchError } = await supabase
      .from('auction_queues')
      .select('*')
      .eq('id', String(queueId))
      .single()

    if (fetchError) throw fetchError
    if (!queue) return { success: false, error: 'ไม่พบรายการคิว' }
    if (queue.guild_id !== session.profile.guild_id) {
      return { success: false, error: 'ไม่สามารถจัดการคิวข้ามกิลด์ได้' }
    }

    const { error } = await supabase
      .from('auction_queues')
      .update({ queue_timestamp: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', String(queueId))

    if (error) throw error

    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function saveAuctionHistory(records: {
  user_id?: string | null
  item_name: ItemType
  requested_qty: number
  awarded_qty: number
  session_date: string
  status?: string
  note?: string | null
  awarded_at?: string
}[]) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const insertData = records.map(record => ({
      guild_id: session.profile.guild_id,
      user_id: record.user_id ?? null,
      item_name: record.item_name,
      requested_qty: record.requested_qty,
      awarded_qty: record.awarded_qty,
      session_date: record.session_date,
      status: record.status ?? 'completed',
      note: record.note ?? null,
      awarded_at: record.awarded_at ?? new Date().toISOString(),
    }))

    const { error } = await supabase.from('auction_history').insert(insertData as any)
    if (error) throw error

    revalidatePath('/auction')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getMyAuctionReservations() {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('auction_queues')
      .select('id, item_name, requested_qty, received_qty, status, queue_timestamp')
      .eq('user_id', session.profile.id)
      .in('status', ['waiting', 'partial'])
      .order('queue_timestamp', { ascending: true })

    if (error) throw error

    return {
      success: true,
      reservations: data || []
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateAuctionQueueReservation(id: string | number, requestedQty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()
    const { data: queue, error: fetchError } = await supabase
      .from('auction_queues')
      .select('received_qty')
      .eq('id', String(id))
      .single()

    if (fetchError) throw fetchError
    if (!queue) return { success: false, error: 'ไม่พบรายการจองคิว' }

    if (requestedQty < queue.received_qty) {
      return {
        success: false,
        error: 'จำนวนที่แก้ไขต้องไม่น้อยกว่าจำนวนที่ได้รับแล้ว'
      }
    }

    const { error } = await supabase
      .from('auction_queues')
      .update({ requested_qty: requestedQty, updated_at: new Date().toISOString() })
      .eq('id', String(id))

    if (error) throw error

    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteAuctionQueueReservation(id: string | number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('auction_queues')
      .delete()
      .eq('id', String(id))

    if (error) throw error

    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
