'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export type ItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

const ITEM_NAMES: Record<ItemType, string> = {
  Album: 'สมุดการ์ด',
  Puppet: 'เศษการ์ดบอส',
  White: 'ขนขาว',
  RedBlack: 'ขนดำแดง'
}

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

    // 🌟 ถ้าไอเทมใดมี Active Round อยู่แล้ว ให้แจกไอเทมตามลำดับคิวในรอบโดยอัตโนมัติ (ไม่สร้างรอบปลอม)
    const { distributeRoundSessionItems } = await import('./auction-rounds')
    for (const item of items) {
      if (item.total_quantity > 0) {
        await distributeRoundSessionItems(item.item_type, item.total_quantity, item.personal_limit || 2)
      }
    }

    revalidatePath('/')
    revalidatePath('/auction')
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

// 2. สมาชิกจองคิว - สร้าง multiple rows (1 per slot)
export async function joinAuctionQueue(itemType: ItemType, requestedQty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()

    // เช็คจำนวนการจองปัจจุบันรวมกับจำนวนที่ขอจองใหม่ ต้องไม่เกิน 10
    const { data: existingQueues, error: fetchCountError } = await supabase
      .from('auction_queues')
      .select('id')
      .eq('user_id', session.profile.id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])

    if (fetchCountError) throw fetchCountError
    const currentCount = existingQueues?.length ?? 0
    if (currentCount + requestedQty > 10) {
      const itemLabel = ITEM_NAMES[itemType] || itemType
      return { success: false, error: `ท่านสามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น (ปัจจุบันมีแล้ว ${currentCount} ชิ้น)` }
    }

    // หา slot_number สูงสุดที่มีอยู่สำหรับ user นี้ + item type นี้
    const { data: existingSlots } = await supabase
      .from('auction_queues')
      .select('slot_number' as any)
      .eq('user_id', session.profile.id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])
      .order('slot_number' as any, { ascending: false })
      .limit(1)

    const maxSlotNumber = ((existingSlots as any)?.[0]?.slot_number ?? 0) as number

    // สร้าง N rows โดยแต่ละ row เป็น 1 slot (requested_qty = 1)
    const newSlots = Array.from({ length: requestedQty }, (_, i) => ({
      guild_id: session.profile.guild_id,
      user_id: session.profile.id,
      item_name: itemType,
      requested_qty: 1,
      received_qty: 0,
      status: 'waiting',
      slot_number: maxSlotNumber + i + 1,
      queue_timestamp: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('auction_queues')
      .insert(newSlots as any)

    if (insertError) throw insertError

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Batch join multiple items - สร้าง N rows per item
export async function joinAuctionQueues(items: { itemType: ItemType; qty: number }[]) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()

    // ตรวจสอบ limit 10 ชิ้น สำหรับทุกไอเทมก่อนดำเนินการ
    for (const { itemType, qty } of items) {
      const { data: existingQueues, error: fetchCountError } = await supabase
        .from('auction_queues')
        .select('id')
        .eq('user_id', session.profile.id)
        .eq('item_name', itemType)
        .in('status', ['waiting', 'partial', 'completed'])

      if (fetchCountError) throw fetchCountError
      const currentCount = existingQueues?.length ?? 0
      if (currentCount + qty > 10) {
        const itemLabel = ITEM_NAMES[itemType] || itemType
        return { success: false, error: `ท่านสามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น (ปัจจุบันมีแล้ว ${currentCount} ชิ้น)` }
      }
    }

    const inserts: any[] = []

    for (const { itemType, qty } of items) {
      // หา slot_number สูงสุด (รวมทุกสถานะรวมทั้ง canceled เพื่อไม่ให้ชน unique constraint)
      const { data: existingSlots } = await supabase
        .from('auction_queues')
        .select('slot_number' as any)
        .eq('user_id', session.profile.id)
        .eq('item_name', itemType)
        .order('slot_number' as any, { ascending: false })
        .limit(1)

      const maxSlotNumber = ((existingSlots as any)?.[0]?.slot_number ?? 0) as number

      // สร้าง qty rows ใหม่ (แต่ละ row = 1 slot)
      for (let i = 0; i < qty; i++) {
        inserts.push({
          guild_id: session.profile.guild_id,
          user_id: session.profile.id,
          item_name: itemType,
          requested_qty: 1,
          received_qty: 0,
          status: 'waiting',
          slot_number: maxSlotNumber + i + 1,
          queue_timestamp: new Date().toISOString()
        })
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('auction_queues').insert(inserts as any)
      if (error) throw error
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 3. ดึงข้อมูลกระดานประมูลปัจจุบันมาแสดงผล
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
      .order('slot_number', { ascending: true })
      .order('id', { ascending: true })

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
        queue_timestamp: q.queue_timestamp,
        slot_number: q.slot_number ?? 1,
        created_at: q.created_at,
      }))

    // 🌟 ดึงรายชื่อสมาชิกในกิลด์ทั้งหมดสำหรับแอดมินใช้ในการจองแทน
    let guildMembers: { id: string; display_name: string; uid_game: string; role: string; avatar_url?: string }[] = []
    if (session.profile.role === 'admin' && session.profile.guild_id) {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, display_name, uid_game, role, avatar_url')
        .eq('guild_id', session.profile.guild_id)
        .order('display_name', { ascending: true })
      guildMembers = (members || []).map((m: any) => ({
        id: String(m.id),
        display_name: m.display_name || 'ไม่ระบุชื่อ',
        uid_game: m.uid_game || '-',
        role: m.role || 'member',
        avatar_url: m.avatar_url || undefined
      }))
    }

    return {
      success: true,
      isAdmin: session.profile.role === 'admin',
      myProfile: { display_name: session.profile.display_name, uid_game: session.profile.uid_game },
      todayItems: todayItems || [],
      memberQueues: processedQueues,
      guildMembers: guildMembers
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 4. ดึงข้อมูลประวัติทั้งจากคิวปกติ (auction_queues) และประวัติรอบการประมูล (auction_round_logs)
export async function getAuctionHistory() {
  try {
    const session = await getSession();
    if (!session?.profile?.guild_id) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบและเข้าร่วมกิลด์ก่อนเปิดดูประวัติ' };
    }

    const myGuildId = session.profile.guild_id;
    const supabase = (await createClient()) as any;

    const [queuesRes, roundLogsRes] = await Promise.all([
      supabase
        .from('auction_queues')
        .select(`
          id,
          item_name,
          requested_qty,
          received_qty,
          status,
          updated_at,
          profiles!inner (
            uid_game,
            display_name,
            guild_id
          )
        `)
        .eq('status', 'completed')
        .eq('profiles.guild_id', myGuildId)
        .order('updated_at', { ascending: false }),

      supabase
        .from('auction_round_logs')
        .select(`
          id,
          round_id,
          round_number,
          item_name,
          action_type,
          qty,
          note,
          created_at,
          profiles:target_user_id (
            uid_game,
            display_name,
            guild_id
          )
        `)
        .eq('guild_id', myGuildId)
        .gt('qty', 0)
        .order('created_at', { ascending: false }),
    ]);

    const formattedQueueHistory = (queuesRes.data || []).map((row: any) => ({
      id: row.id,
      item_name: row.item_name,
      requested_qty: row.requested_qty,
      awarded_qty: row.received_qty,
      status: row.status,
      awarded_at: row.updated_at,
      display_name: row.profiles?.display_name || 'ไม่ระบุชื่อ',
      uid_game: row.profiles?.uid_game || '-',
      note: 'ประมูลสำเร็จ (คิวปกติ)',
    }));

    const formattedRoundHistory = (roundLogsRes.data || []).map((row: any) => ({
      id: `roundlog_${row.id}`,
      rawLogId: row.id,
      item_name: row.item_name,
      requested_qty: row.qty,
      awarded_qty: row.qty,
      status: 'completed',
      awarded_at: row.created_at,
      display_name: row.profiles?.display_name || 'สมาชิกในรอบ',
      uid_game: row.profiles?.uid_game || '-',
      note: row.note || `รอบที่ ${row.round_number}`,
      roundNumber: row.round_number,
    }));

    const mergedHistory = [...formattedQueueHistory, ...formattedRoundHistory].sort((a, b) => {
      const timeA = new Date(a.awarded_at).getTime() || 0;
      const timeB = new Date(b.awarded_at).getTime() || 0;
      return timeB - timeA;
    });

    return { success: true, history: mergedHistory };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 5. แอดมินกดแจกของรางวัล (อัปเดตตารางเดียว ไม่ยิงเข้า history แล้ว)
export async function awardAuctionQueue(queueId: string | number, awardQty: number, note?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const { data: queue, error: fetchError } = await supabase
      .from('auction_queues')
      .select('*, profiles:user_id(display_name, uid_game)')
      .eq('id', String(queueId))
      .single() as any

    if (fetchError) throw fetchError
    if (!queue) return { success: false, error: 'ไม่พบรายการคิว' }

    // 🛑 Idempotency Protection: ถ้าสล็อตนี้ completed ไปแล้ว ห้ามกดแจกซ้ำเด็ดขาด!
    if (queue.status === 'completed') {
      return { success: false, error: 'สล็อตนี้ได้รับการประมูลและมอบรางวัลไปเรียบร้อยแล้ว' }
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

    // เซฟตี้ด่าน 1: ถ้าวันนี้เขารับไปจนครบโควตาก่อนหน้านี้แล้ว
    if (receivedTodayBefore >= personalLimit) {
        return { success: false, error: `วันนี้สมาชิกได้รับครบโควตา ${personalLimit} ชิ้นแล้วครับ` }
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

    // 🌟 Auto-Link: อัปเดตสะสมยอดในรอบการประมูล (Round Quota)
    try {
      const { awardRoundProgress } = await import('./auction-rounds')
      await awardRoundProgress(
        session.profile.guild_id,
        queue.user_id,
        queue.item_name as ItemType,
        1,
        session.profile.id,
        note
      )
    } catch (roundErr) {
      console.error('awardRoundProgress error (non-fatal):', roundErr)
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 🌟 5.1 แอดมินกดบันทึกผลการประมูลแบบกลุ่ม (Batch Multi-Award)
 * รับ Array ของ queueIds ที่เลือกไว้ และประมวลผลก้อนเดียวใน 1 Transaction
 */
export async function batchAwardAuctionQueues(queueIds: string[], note?: string) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    if (!queueIds || queueIds.length === 0) {
      return { success: true, awardedCount: 0 }
    }

    const guildId = session.profile.guild_id
    if (!guildId) return { success: false, error: 'ไม่พบข้อมูลกิลด์' }

    const supabase = (await createClient()) as any
    const roundSlotIds = queueIds.filter(id => id.startsWith('round_'))
    const standardQueueIds = queueIds.filter(id => !id.startsWith('round_'))

    let totalAwarded = 0
    const allAwardedIds: string[] = []

    // 🌟 1. บันทึกผลสำหรับสล็อตของรอบการประมูล (Round Slots)
    if (roundSlotIds.length > 0) {
      const { manualAwardRoundMember } = await import('./auction-rounds')
      // Group by roundMemberId (e.g. round_MEMID_1 -> MEMID)
      const roundMemberCountMap: Record<string, number> = {}
      roundSlotIds.forEach(id => {
        const parts = id.split('_')
        const roundMemberId = parts[1]
        if (roundMemberId) {
          roundMemberCountMap[roundMemberId] = (roundMemberCountMap[roundMemberId] || 0) + 1
        }
      })

      for (const [roundMemberId, count] of Object.entries(roundMemberCountMap)) {
        await manualAwardRoundMember(roundMemberId, count, note || `บันทึกการประมูลผ่านผังสล็อต ${count} ชิ้น`)
      }

      totalAwarded += roundSlotIds.length
      allAwardedIds.push(...roundSlotIds)
    }

    // 🌟 2. บันทึกผลสำหรับคิวปกติ (Classic On-Demand Queues)
    if (standardQueueIds.length > 0) {
      const { data: targetQueues, error: fetchErr } = await supabase
        .from('auction_queues')
        .select('id, user_id, guild_id, item_name, status, requested_qty, received_qty')
        .in('id', standardQueueIds)
        .eq('guild_id', guildId)
        .neq('status', 'completed')

      if (fetchErr) throw fetchErr

      if (targetQueues && targetQueues.length > 0) {
        const validIds = targetQueues.map((q: any) => q.id)
        const nowIso = new Date().toISOString()
        const { error: updateErr } = await supabase
          .from('auction_queues')
          .update({
            status: 'completed',
            received_qty: 1,
            updated_at: nowIso,
          })
          .in('id', validIds)

        if (updateErr) throw updateErr

        // รวมยอดและตัดโควตารอบกิลด์ (Group by User & Item)
        const userItemMap: Record<string, { userId: string; itemName: ItemType; count: number }> = {}
        for (const q of targetQueues) {
          if (!q.user_id) continue
          const key = `${q.user_id}_${q.item_name}`
          if (!userItemMap[key]) {
            userItemMap[key] = { userId: q.user_id, itemName: q.item_name as ItemType, count: 0 }
          }
          userItemMap[key].count += 1
        }

        try {
          const { awardRoundProgress } = await import('./auction-rounds')
          for (const entry of Object.values(userItemMap)) {
            await awardRoundProgress(
              guildId,
              entry.userId,
              entry.itemName,
              entry.count,
              session.profile.id,
              note || `บันทึกการประมูลแบบกลุ่ม ${entry.count} ชิ้น`
            )
          }
        } catch (roundErr) {
          console.error('Batch awardRoundProgress error:', roundErr)
        }

        totalAwarded += validIds.length
        allAwardedIds.push(...validIds)
      }
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')

    return {
      success: true,
      awardedCount: totalAwarded,
      awardedIds: allAwardedIds,
    }
  } catch (err: any) {
    console.error('batchAwardAuctionQueues error:', err)
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกการประมูลแบบกลุ่ม' }
  }
}


// สมมติว่า ItemType มีการประกาศไว้อยู่แล้ว เช่น type ItemType = 'sword' | 'shield' | string;

export async function syncUserAuctionQueues(items: { itemType: ItemType; qty: number }[]) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    // ตรวจสอบ limit 10 ชิ้น
    for (const { itemType, qty } of items) {
      if (qty > 10) {
        const itemLabel = ITEM_NAMES[itemType] || itemType
        return { success: false, error: `ท่านสามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น` }
      }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    for (const { itemType, qty } of items) {
      // 1. ดึงคิวทั้งหมดของไอเทมชิ้นนี้ (รวมทุกสถานะเพื่อคำนวณ max slot_number อย่างถูกต้อง)
      const { data } = await supabase
        .from('auction_queues')
        .select('id, status, slot_number, queue_timestamp, updated_at')
        .eq('user_id', session.profile.id)
        .eq('item_name', itemType)

      // บังคับให้ TypeScript มองข้าม SelectQueryError ไปก่อนชั่วคราว
      const existingQueues = data as any[] || []

      // คำนวณหา max slot_number จากคิวทั้งหมดในระบบเพื่อไม่ให้ชน unique constraint
      const maxSlotNumber = Math.max(...existingQueues.map(q => q.slot_number || 0), 0)

      // คิวที่ถือว่ายังอยู่ในกระดานวันนี้: 
      // - คิวที่รออยู่ (waiting) ไม่ว่าจะจองวันไหน (ทบยอด)
      // - คิวที่สำเร็จ/แจกบางส่วนแล้ว (completed/partial) ของวันนี้เท่านั้น
      const activeQueues = existingQueues.filter(q => {
        if (q.status !== 'waiting' && q.status !== 'partial' && q.status !== 'completed') return false;
        if (q.status === 'waiting') return true;
        const queueDate = q.updated_at ? q.updated_at.split('T')[0] : (q.queue_timestamp ? q.queue_timestamp.split('T')[0] : '');
        return queueDate === today;
      });

      // แยกคิวที่ยัง "รออยู่" ออกมาเรียงจากใหม่ไปเก่า
      const waitingQueues = activeQueues
        .filter(q => q.status === 'waiting')
        .sort((a, b) => new Date(b.queue_timestamp).getTime() - new Date(a.queue_timestamp).getTime())      
      // นับจำนวนคิวที่ได้รับของไปแล้วของวันนี้
      const nonWaitingCount = activeQueues.filter(q => q.status !== 'waiting').length

      // 2. คำนวณหา "จำนวนคิวรอ (waiting) ที่ควรจะเป็น" 
      const targetWaitingCount = Math.max(0, qty - nonWaitingCount)
      const currentWaitingCount = waitingQueues.length
      const diff = targetWaitingCount - currentWaitingCount

      if (diff > 0) {
        // ✨ กรณีตัวเลขในช่อง "มากกว่า" คิวที่มีอยู่ -> สร้างเพิ่ม
        // 💡 แก้ไข Type โดยใส่ `as const` ให้ status และจัดการ `undefined` ของ guild_id
        const inserts = Array.from({ length: diff }, (_, i) => ({
          guild_id: session.profile.guild_id || null, // เปลี่ยน undefined เป็น null ป้องกัน error จาก Supabase
          user_id: session.profile.id,
          item_name: itemType,
          requested_qty: 1,
          received_qty: 0,
          status: 'waiting' as const, // บังคับให้เป็น Literal type แทนที่จะเป็นแค่ string
          slot_number: maxSlotNumber + i + 1,
          queue_timestamp: new Date().toISOString()
        }))

        // 💡 เอา `as any` ออกได้แล้ว
        // 💡 บังคับให้ TypeScript ข้ามการเช็ค Type ก่อนตอน Insert
        const { error } = await supabase.from('auction_queues').insert(inserts as any)
        if (error) throw error

      } else if (diff < 0) {
        // ✨ กรณีตัวเลขในช่อง "น้อยกว่า" คิวที่มีอยู่ หรือเป็น 0 -> ลบคิวที่รออยู่ออก
        const countToDelete = Math.abs(diff)
        const idsToDelete = waitingQueues.slice(0, countToDelete).map(q => q.id)

        if (idsToDelete.length > 0) {
          const { error } = await supabase
            .from('auction_queues')
            .delete()
            .in('id', idsToDelete)
            
          if (error) throw error
        }
      }
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
    
  } catch (err: unknown) {
    // 💡 ใส่ console.error ตรงนี้เพื่อดูว่า Postgres ฟ้องว่าอะไรใน Terminal ของคุณ
    console.error("❌ เกิด Error ใน syncUserAuctionQueues:", err)

    const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    return { success: false, error: errorMessage }
  }
}

// 6. แอดมินกดข้ามคิว
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

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 7. ดึงข้อมูลรายการที่กำลังรอคิวของฉัน (หน้าโปรไฟล์)
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

// 8. สมาชิกแก้ไขจำนวนการจองคิว
export async function updateAuctionQueueReservation(id: string | number, requestedQty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()
    const { data: queue, error: fetchError } = await supabase
      .from('auction_queues')
      .select('received_qty, item_name')
      .eq('id', String(id))
      .single() as any

    if (fetchError) throw fetchError
    if (!queue) return { success: false, error: 'ไม่พบรายการจองคิว' }

    if (requestedQty < queue.received_qty) {
      return {
        success: false,
        error: 'จำนวนที่แก้ไขต้องไม่น้อยกว่าจำนวนที่ได้รับแล้ว'
      }
    }

    if (requestedQty > 10) {
      return {
        success: false,
        error: 'ท่านสามารถจองไอเทมแต่ละประเภทได้ไม่เกิน 10 ชิ้น'
      }
    }

    const { error } = await supabase
      .from('auction_queues')
      .update({ requested_qty: requestedQty, updated_at: new Date().toISOString() })
      .eq('id', String(id))

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 9. ลบประวัติประมูล / ย้อนสถานะไอเทมที่แจกแล้วกลับคืนสู่สถานะรอคิว (Revert Action)
export async function revertAuctionQueue(id: string | number) {
  try { 
    const session = await getSession();
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient();
   
    // 1. ดึงข้อมูลคิวก่อน revert
    const { data: queue } = await supabase
      .from('auction_queues')
      .select('*')
      .eq('id', String(id))
      .maybeSingle()

    if (!queue) return { success: false, error: 'ไม่พบรายการคิว' }

    // 2. ⚡ Auto-Link: ถ้ารายการนี้เคย completed ให้ย้อนคืนสิทธิ์ในรอบการประมูลทันที!
    if (queue.status === 'completed' && queue.user_id) {
      try {
        const { revertRoundProgress } = await import('./auction-rounds')
        await revertRoundProgress(
          session.profile.guild_id,
          queue.user_id,
          queue.item_name as ItemType,
          1,
          session.profile.id,
          'ลบประวัติการประมูลและย้อนคืนสิทธิ์'
        )
      } catch (revertErr) {
        console.error('revertRoundProgress error (non-fatal):', revertErr)
      }
    }

    // 3. 🔄 อัปเดตสถานะกลับเป็นรอรับของ
    const { error } = await supabase
      .from('auction_queues')
      .update({
        received_qty: 0,
        status: 'waiting',
        updated_at: new Date().toISOString()
      })
      .eq('id', String(id));

    if (error) throw error;

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 🌟 9.1 ลบประวัติประมูลแบบกลุ่ม (Batch Revert Action)
 * รับ Array ของ queueIds และย้อนคืนสถานะทั้งหมดในคำสั่งเดียว
 */
export async function batchRevertAuctionQueues(ids: (string | number)[]) {
  try {
    const session = await getSession();
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' };
    }

    if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
    }

    const guildId = session.profile.guild_id;
    if (!guildId) return { success: false, error: 'ไม่พบข้อมูลกิลด์' };

    const supabase = (await createClient()) as any;
    const stringIds = ids.map(id => String(id));
    const roundLogIds = stringIds.filter(id => id.startsWith('roundlog_'));
    const roundSlotIds = stringIds.filter(id => id.startsWith('round_'));
    const standardQueueIds = stringIds.filter(id => !id.startsWith('round_') && !id.startsWith('roundlog_'));

    let totalReverted = 0;

    // 🌟 1. ย้อนคืนผลการประมูลจากประวัติ Log ของรอบ (roundlog_LOGID)
    if (roundLogIds.length > 0) {
      const rawLogIds = roundLogIds.map(id => id.replace('roundlog_', ''));
      const { data: logs } = await supabase
        .from('auction_round_logs')
        .select('*')
        .in('id', rawLogIds);

      if (logs && logs.length > 0) {
        for (const log of logs) {
          if (log.target_user_id && log.round_id && log.qty > 0) {
            const { data: member } = await supabase
              .from('auction_round_members')
              .select('*')
              .eq('round_id', log.round_id)
              .eq('user_id', log.target_user_id)
              .maybeSingle();

            if (member) {
              const newReceived = Math.max(0, (member.received_qty || 0) - log.qty);
              const targetQuota = (member.base_quota || 0) + (member.transferred_in_quota || 0) - (member.transferred_out_quota || 0);
              const isComplete = newReceived >= targetQuota && targetQuota > 0;

              await supabase
                .from('auction_round_members')
                .update({
                  received_qty: newReceived,
                  status: isComplete ? 'completed' : (newReceived > 0 ? 'in_progress' : 'pending'),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', member.id);
            }
          }
        }

        await supabase
          .from('auction_round_logs')
          .delete()
          .in('id', rawLogIds);

        totalReverted += rawLogIds.length;
      }
    }

    // 🌟 2. ย้อนคืนผลการประมูลสำหรับ Round Slots (round_MEMID_1)
    if (roundSlotIds.length > 0) {
      const roundMemberCountMap: Record<string, number> = {};
      roundSlotIds.forEach(id => {
        const parts = id.split('_');
        const roundMemberId = parts[1];
        if (roundMemberId) {
          roundMemberCountMap[roundMemberId] = (roundMemberCountMap[roundMemberId] || 0) + 1;
        }
      });

      for (const [roundMemberId, count] of Object.entries(roundMemberCountMap)) {
        const { data: member } = await supabase
          .from('auction_round_members')
          .select('*')
          .eq('id', roundMemberId)
          .maybeSingle();

        if (member) {
          const newReceived = Math.max(0, (member.received_qty || 0) - count);
          const targetQuota = (member.base_quota || 0) + (member.transferred_in_quota || 0) - (member.transferred_out_quota || 0);
          const isComplete = newReceived >= targetQuota && targetQuota > 0;

          await supabase
            .from('auction_round_members')
            .update({
              received_qty: newReceived,
              status: isComplete ? 'completed' : (newReceived > 0 ? 'in_progress' : 'pending'),
              updated_at: new Date().toISOString(),
            })
            .eq('id', member.id);

          await supabase.from('auction_round_logs').insert({
            guild_id: guildId,
            round_id: member.round_id,
            round_number: member.round_number,
            item_name: member.item_name,
            action_type: 'MANUAL_OVERRIDE',
            target_user_id: member.user_id,
            qty: -count,
            performed_by: session.profile.id,
            note: `ยกเลิกผลการประมูล จำนวน ${count} ชิ้น (คงเหลือสะสม ${newReceived}/${targetQuota})`,
          });
        }
      }

      totalReverted += roundSlotIds.length;
    }

    // 🌟 3. ย้อนคืนผลการประมูลสำหรับคิวปกติ (auction_queues)
    if (standardQueueIds.length > 0) {
      const { data: queues, error: fetchErr } = await supabase
        .from('auction_queues')
        .select('id, user_id, guild_id, item_name, status, received_qty')
        .in('id', standardQueueIds)
        .eq('guild_id', guildId);

      if (fetchErr) throw fetchErr;

      if (queues && queues.length > 0) {
        const userItemMap: Record<string, { userId: string; itemName: ItemType; count: number }> = {};
        for (const q of queues) {
          if (q.status === 'completed' && q.user_id) {
            const key = `${q.user_id}_${q.item_name}`;
            if (!userItemMap[key]) {
              userItemMap[key] = { userId: q.user_id, itemName: q.item_name as ItemType, count: 0 };
            }
            userItemMap[key].count += 1;
          }
        }

        try {
          const { revertRoundProgress } = await import('./auction-rounds');
          for (const entry of Object.values(userItemMap)) {
            await revertRoundProgress(
              guildId,
              entry.userId,
              entry.itemName,
              entry.count,
              session.profile.id,
              `ลบประวัติการประมูลแบบกลุ่ม ${entry.count} ชิ้น และย้อนคืนสิทธิ์`
            );
          }
        } catch (revertErr) {
          console.error('Batch revertRoundProgress error (non-fatal):', revertErr);
        }

        const validIds = queues.map((q: any) => q.id);
        const { error: updateErr } = await supabase
          .from('auction_queues')
          .update({
            received_qty: 0,
            status: 'waiting',
            updated_at: new Date().toISOString(),
          })
          .in('id', validIds);

        if (updateErr) throw updateErr;
        totalReverted += validIds.length;
      }
    }

    revalidatePath('/');
    revalidatePath('/auction');
    revalidatePath('/profile');

    return { success: true, count: totalReverted };
  } catch (err: any) {
    console.error('batchRevertAuctionQueues error:', err);
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบประวัติแบบกลุ่ม' };
  }
}

// 10. สำหรับ Member ใช้กดยกเลิกจองคิวในหน้า Profile (ลบทิ้งออกจาก DB 100%)
export async function deleteAuctionQueueReservation(id: string | number) {
  try { 
    const session = await getSession();
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient();
   
    // 🔥 เปลี่ยนมาใช้คำสั่ง .delete() เพื่อทำลายข้อมูลทิ้ง!
    const { error } = await supabase
      .from('auction_queues')
      .delete()
      .eq('id', String(id));

    if (error) throw error;

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// 10.1 หัวกิลด์/แอดมินจองคิวประมูลแทนสมาชิกในกิลด์ (Proxy Booking)
export async function adminBookAuctionQueueForMember(
  targetUserId: string,
  items: { itemType: ItemType; requestedQty: number }[]
) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()

    // ตรวจสอบว่า targetUserId อยู่ในกิลด์เดียวกันกับ admin จริงหรือไม่
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, display_name, guild_id')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetError || !targetProfile || targetProfile.guild_id !== session.profile.guild_id) {
      return { success: false, error: 'ไม่พบสมาชิก หรือสมาชิกไม่ได้อยู่ในกิลด์ของคุณ' }
    }

    // ตรวจสอบโควต้าแต่ละไอเทมก่อนดำเนินการ
    for (const { itemType, requestedQty } of items) {
      if (requestedQty <= 0) continue

      const { data: existingQueues, error: fetchCountError } = await supabase
        .from('auction_queues')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('item_name', itemType)
        .in('status', ['waiting', 'partial', 'completed'])

      if (fetchCountError) throw fetchCountError
      const currentCount = existingQueues?.length ?? 0
      if (currentCount + requestedQty > 10) {
        const itemLabel = ITEM_NAMES[itemType] || itemType
        return { success: false, error: `${targetProfile.display_name} สามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น (ปัจจุบันมีแล้ว ${currentCount} ชิ้น)` }
      }
    }

    const inserts: any[] = []

    for (const { itemType, requestedQty } of items) {
      if (requestedQty <= 0) continue

      const { data: existingSlots } = await supabase
        .from('auction_queues')
        .select('slot_number' as any)
        .eq('user_id', targetUserId)
        .eq('item_name', itemType)
        .order('slot_number' as any, { ascending: false })
        .limit(1)

      const maxSlotNumber = ((existingSlots as any)?.[0]?.slot_number ?? 0) as number

      for (let i = 0; i < requestedQty; i++) {
        inserts.push({
          guild_id: session.profile.guild_id,
          user_id: targetUserId,
          item_name: itemType,
          requested_qty: 1,
          received_qty: 0,
          status: 'waiting' as const,
          slot_number: maxSlotNumber + i + 1,
          queue_timestamp: new Date().toISOString()
        })
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from('auction_queues').insert(inserts as any)
      if (error) throw error
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 10.2 แอดมิน Sync จำนวนคิวของสมาชิก (ปรับเพิ่ม/ลดให้ตรงกับจำนวนที่ระบุ)
export async function syncMemberAuctionQueue(userId: string, itemType: string, qty: number) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    if (qty > 10) {
      const itemLabel = ITEM_NAMES[itemType as ItemType] || itemType
      return { success: false, error: `สามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น` }
    }

    const supabase = await createClient()

    // ตรวจสอบสมาชิกว่าอยู่ในกิลด์เดียวกัน
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, guild_id')
      .eq('id', userId)
      .maybeSingle()

    if (!targetProfile || targetProfile.guild_id !== session.profile.guild_id) {
      return { success: false, error: 'ไม่พบสมาชิก หรือสมาชิกไม่ได้อยู่ในกิลด์ของคุณ' }
    }

    const today = new Date().toISOString().split('T')[0]

    // 1. ดึงคิวทั้งหมดของ สมาชิกคนนี้ สำหรับไอเทมชิ้นนี้
    const { data: rawQueues } = await supabase
      .from('auction_queues')
      .select('id, status, slot_number, queue_timestamp, guild_id, updated_at')
      .eq('user_id', userId) 
      .eq('item_name', itemType)

    const queues = (rawQueues as any[]) || []
    const maxSlotNumber = Math.max(...queues.map(q => q.slot_number || 0), 0)

    const activeQueues = queues.filter(q => {
      if (q.status !== 'waiting' && q.status !== 'partial' && q.status !== 'completed') return false;
      if (q.status === 'waiting') return true;
      const queueDate = q.updated_at ? q.updated_at.split('T')[0] : (q.queue_timestamp ? q.queue_timestamp.split('T')[0] : '');
      return queueDate === today;
    })
    
    const waitingQueues = activeQueues
      .filter(q => q.status === 'waiting') 
      .sort((a, b) => new Date(b.queue_timestamp).getTime() - new Date(a.queue_timestamp).getTime())
    
    const nonWaitingCount = activeQueues.filter(q => q.status !== 'waiting').length

    const targetWaitingCount = Math.max(0, qty - nonWaitingCount)
    const currentWaitingCount = waitingQueues.length
    const diff = targetWaitingCount - currentWaitingCount

    if (diff > 0) {
      const inserts = Array.from({ length: diff }, (_, i) => ({
        guild_id: session.profile.guild_id,
        user_id: userId,
        item_name: itemType,
        requested_qty: 1,
        received_qty: 0,
        status: 'waiting' as const,
        slot_number: maxSlotNumber + i + 1,
        queue_timestamp: new Date().toISOString()
      }))

      const { error } = await supabase.from('auction_queues').insert(inserts as any)
      if (error) throw error

    } else if (diff < 0) {
      const countToDelete = Math.abs(diff)
      const idsToDelete = waitingQueues.slice(0, countToDelete).map(q => q.id)

      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from('auction_queues')
          .delete()
          .in('id', idsToDelete)
          
        if (error) throw error
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

// 10.3 แอดมิน Sync หลายไอเทมพร้อมกันให้สมาชิกคนหนึ่ง
export async function adminSyncMemberAllAuctionQueues(
  targetUserId: string,
  items: { itemType: ItemType; qty: number }[]
) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    for (const item of items) {
      const res = await syncMemberAuctionQueue(targetUserId, item.itemType, item.qty)
      if (!res.success) {
        return res
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

// 11. เคลียร์คิวประมูลตามประเภทไอเทม (Hard Delete - ลบคิวรอรอบถัดไป & คิวประมูลเสร็จแล้วออกจากฐานข้อมูล)
export async function clearQueueByItemType(itemType: ItemType) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]


    // ล้างคิวทั้งหมดของประเภทไอเทมนี้ (ทั้งรอจัดสรร, ได้รับบางส่วน, และเสร็จสิ้นแล้ว)
    const { error: deleteError, count } = await supabase
      .from('auction_queues')
      .delete({ count: 'exact' })
      .eq('guild_id', session.profile.guild_id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])

    if (deleteError) throw deleteError


    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')

    return { success: true, count: count || 0 }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}