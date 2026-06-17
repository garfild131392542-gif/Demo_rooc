'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'
import { sendDiscordNotification } from '@/lib/discord'

export type ItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

const ITEM_NAMES: Record<ItemType, string> = {
  Album: 'สมุดการ์ด',
  Puppet: 'เศษการ์ดบอส',
  White: 'ขนขาว',
  RedBlack: 'ขนดำ/แดง'
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

// 4. ดึงข้อมูลประวัติเฉพาะแถวที่สถานะเป็น 'completed' กั้นสิทธิ์ตาม guild_id
export async function getAuctionHistory() {
  try {
    const session = await getSession();
    if (!session?.profile?.guild_id) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบและเข้าร่วมกิลด์ก่อนเปิดดูประวัติ' };
    }

    const myGuildId = session.profile.guild_id;
    const supabase = await createClient();

    const { data: history, error } = await supabase
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
      .eq('status', 'completed') // ✨ ดึงเฉพาะที่ประมูลแจกเสร็จสิ้นแล้วเท่านั้น
      .eq('profiles.guild_id', myGuildId) // 🔒 กั้นสิทธิ์ดูเฉพาะภายในกิลด์ตัวเอง
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const formattedHistory = (history || []).map((row: any) => ({
      id: row.id,
      item_name: row.item_name,
      requested_qty: row.requested_qty,
      awarded_qty: row.received_qty,
      status: row.status,
      awarded_at: row.updated_at,
      display_name: row.profiles?.display_name || 'ไม่ระบุชื่อ',
      uid_game: row.profiles?.uid_game || '-',
    }));

    return { success: true, history: formattedHistory };
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

    // ดึงข้อมูลกิลด์และ webhook
    const { data: guildData } = await supabase
      .from('guilds')
      .select('discord_webhook_url, name')
      .eq('id', session.profile.guild_id)
      .maybeSingle() as any

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

    // ส่งการแจ้งเตือน Discord Webhook
    if (guildData?.discord_webhook_url) {
      const recipientName = queue.profiles?.display_name || queue.profiles?.uid_game || 'สมาชิกกิลด์';
      const itemName = queue.item_name;
      const qty = 1; // standard qty distributed is 1
      await sendDiscordNotification(guildData.discord_webhook_url, {
        embeds: [
          {
            title: "🎉 แจกจ่ายไอเทมสำเร็จ (Item Distributed)",
            description: `🎉 **${recipientName}** has received **${qty}x ${itemName}**!`,
            color: 5763719, // Green
            timestamp: new Date().toISOString(),
          }
        ]
      });
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
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
      // 1. ดึงคิวทั้งหมดของไอเทมชิ้นนี้เพื่อหาค่า slot_number สูงสุด และหาคิวที่ยังค้างอยู่
      const { data } = await supabase
        .from('auction_queues')
        .select('id, status, slot_number, queue_timestamp, updated_at')
        .eq('user_id', session.profile.id)
        .eq('item_name', itemType)
        .in('status', ['waiting', 'partial', 'completed'])

      // บังคับให้ TypeScript มองข้าม SelectQueryError ไปก่อนชั่วคราว
      const existingQueues = data as any[] || []

      // คำนวณหา max slot_number จากคิวทั้งหมดในระบบเพื่อไม่ให้ชน unique constraint
      const maxSlotNumber = Math.max(...existingQueues.map(q => q.slot_number || 0), 0)

      // คิวที่ถือว่ายังอยู่ในกระดานวันนี้: 
      // - คิวที่รออยู่ (waiting) ไม่ว่าจะจองวันไหน (ทบยอด)
      // - คิวที่สำเร็จ/แจกบางส่วนแล้ว (completed/partial) ของวันนี้เท่านั้น
      const activeQueues = existingQueues.filter(q => {
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
   
    // 🔄 อันนี้ใช้อัปเดตสถานะกลับเป็นรอรับของ
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


export async function syncMemberAuctionQueue(userId: string, itemType: string, qty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    // (ทางที่ดีควรเช็คเพิ่มตรงนี้ว่า session.profile เป็น Admin หรือไม่)

    if (qty > 10) {
      const itemLabel = ITEM_NAMES[itemType as ItemType] || itemType
      return { success: false, error: `สามารถจอง ${itemLabel} ได้ไม่เกิน 10 ชิ้น` }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // 1. ดึงคิวทั้งหมดของ สมาชิกคนนี้ สำหรับไอเทมชิ้นนี้ (ไม่กรองวันที่เพื่อไม่ให้ชน unique constraint)
    const { data: rawQueues } = await supabase
      .from('auction_queues')
      .select('id, status, slot_number, queue_timestamp, guild_id, updated_at')
      .eq('user_id', userId) 
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])

    const queues = (rawQueues as any[]) || []

    // คำนวณหา max slot_number จากคิวทั้งหมดในระบบ
    const maxSlotNumber = Math.max(...queues.map(q => q.slot_number || 0), 0)

    // คิวที่ถือว่ายังอยู่ในกระดานวันนี้: 
    // - คิวที่รออยู่ (waiting) ไม่ว่าจะจองวันไหน (ทบยอด)
    // - คิวที่สำเร็จ/แจกบางส่วนแล้ว (completed/partial) ของวันนี้เท่านั้น
    const activeQueues = queues.filter(q => {
      if (q.status === 'waiting') return true;
      const queueDate = q.updated_at ? q.updated_at.split('T')[0] : (q.queue_timestamp ? q.queue_timestamp.split('T')[0] : '');
      return queueDate === today;
    })
    
    // แยกคิวรอแจก เรียงจากใหม่ไปเก่า (เพื่อเวลาลบ จะได้ลบคิวท้ายแถวก่อน)
    const waitingQueues = activeQueues
      .filter(q => q.status === 'waiting') 
      .sort((a, b) => new Date(b.queue_timestamp).getTime() - new Date(a.queue_timestamp).getTime())
    
    // นับคิวที่ได้ของไปแล้ว
    const nonWaitingCount = activeQueues.filter(q => q.status !== 'waiting').length

    // 2. คำนวณหาเป้าหมายคิวรอ
    const targetWaitingCount = Math.max(0, qty - nonWaitingCount)
    const currentWaitingCount = waitingQueues.length
    const diff = targetWaitingCount - currentWaitingCount

    if (diff > 0) {
      // ➕ กรณีคีย์ตัวเลขเพิ่มขึ้น -> สร้างคิวรอเพิ่มต่อท้าย
      const guildId = queues[0]?.guild_id || session.profile.guild_id || null;

      const inserts = Array.from({ length: diff }, (_, i) => ({
        guild_id: guildId,
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
      // ➖ กรณีคีย์ตัวเลขน้อยลง -> ลบคิวรอส่วนเกินทิ้งจากท้ายแถว
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

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// 11. เคลียร์คิวประมูลตามประเภทไอเทม (Soft Delete - Canceled คิวรอรอบถัดไป & คิวประมูลเสร็จแล้ว)
export async function clearQueueByItemType(itemType: ItemType) {
  try {
    const session = await getSession()
    if (!session?.profile || session.profile.role !== 'admin') {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // ดึงข้อมูลกิลด์และ webhook URL
    const { data: guildData } = await supabase
      .from('guilds')
      .select('discord_webhook_url, name')
      .eq('id', session.profile.guild_id)
      .maybeSingle() as any

    // 1. ดึงข้อมูลเซสชันวันนี้เพื่อหา total_quantity และ personal_limit
    const { data: todaySession, error: sessionError } = await supabase
      .from('auction_sessions')
      .select('total_quantity, personal_limit')
      .eq('guild_id', session.profile.guild_id)
      .eq('item_name', itemType)
      .eq('session_date', today)
      .eq('status', 'active')
      .maybeSingle()

    if (sessionError) throw sessionError
    const totalQuantity = todaySession?.total_quantity ?? 0
    const personalLimit = todaySession?.personal_limit ?? 0

    // 2. ดึงคิวทั้งหมดของวันนี้ (รอ, สำเร็จ, บางส่วน)
    const { data: rawQueues, error: queueError } = await supabase
      .from('auction_queues')
      .select('id, user_id, status, queue_timestamp, slot_number')
      .eq('guild_id', session.profile.guild_id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial', 'completed'])

    if (queueError) throw queueError

    // 3. กรองและคำนวณคิว waitlisted ตามลอจิกเดียวกันกับบอร์ด
    const userTotalSlotsMap = new Map<string, number>()
    ;(rawQueues || []).forEach((q: any) => {
      const key = q.user_id
      userTotalSlotsMap.set(key, (userTotalSlotsMap.get(key) ?? 0) + 1)
    })

    let shownCountPerUser = new Map<string, number>()
    const qualifiedQueues = (rawQueues || []).filter((q: any) => {
      const alreadyShown = shownCountPerUser.get(q.user_id) ?? 0
      const shouldShow = alreadyShown < personalLimit
      if (shouldShow) {
        shownCountPerUser.set(q.user_id, alreadyShown + 1)
      }
      return shouldShow
    })

    // เรียงตามเวลาและลำดับคิว
    qualifiedQueues.sort((a: any, b: any) => {
      const timeA = a.queue_timestamp || ''
      const timeB = b.queue_timestamp || ''
      if (timeA !== timeB) return timeA.localeCompare(timeB)

      const slotA = a.slot_number ?? 0
      const slotB = b.slot_number ?? 0
      if (slotA !== slotB) return slotA - slotB

      return (a.id || '').localeCompare(b.id || '')
    })

    // คิวที่อยู่เกิน totalQuantity คือ waitlist
    const waitlistedIds = qualifiedQueues
      .slice(totalQuantity)
      .map((q: any) => q.id)

    // คิวที่แจกเสร็จแล้ว (status = 'completed')
    const completedIds = (rawQueues || [])
      .filter((q: any) => q.status === 'completed')
      .map((q: any) => q.id)

    // รวมรายการที่ต้องยกเลิก (soft delete)
    const idsToCancel = Array.from(new Set([...waitlistedIds, ...completedIds]))

    if (idsToCancel.length > 0) {
      const { error: updateError } = await supabase
        .from('auction_queues')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .in('id', idsToCancel)

      if (updateError) throw updateError
    }

    // ส่งการแจ้งเตือน Discord Webhook เคลียร์คิว/เริ่มรอบใหม่
    if (guildData?.discord_webhook_url) {
      await sendDiscordNotification(guildData.discord_webhook_url, {
        embeds: [
          {
            title: "📢 ล้างคิวสำเร็จ / เริ่มรอบใหม่ (Queue Reset)",
            description: `📢 The queue for **${itemType}** has been reset. A new round is starting!`,
            color: 16753920, // Orange
            timestamp: new Date().toISOString(),
          }
        ]
      });
    }

    revalidatePath('/')
    revalidatePath('/auction')
    revalidatePath('/profile')

    return { success: true, count: idsToCancel.length }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}