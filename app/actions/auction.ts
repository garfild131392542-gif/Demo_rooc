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

// 2. สมาชิกจองคิว
export async function joinAuctionQueue(itemType: ItemType, requestedQty: number) {
  try {
    const session = await getSession()
    if (!session?.profile) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }

    const supabase = await createClient()

    // เช็คว่าเคยจองค้างไว้ไหม
    const { data: existingQueue } = await supabase
      .from('auction_queues')
      .select('id, requested_qty')
      .eq('user_id', session.profile.id)
      .eq('item_name', itemType)
      .in('status', ['waiting', 'partial'])
      .maybeSingle()

    if (existingQueue) {
      // 🌟 ใส่ as any ตรงอัปเดต
      await supabase
        .from('auction_queues')
        .update({ 
          requested_qty: existingQueue.requested_qty + requestedQty,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingQueue.id)
    } else {
      // 🌟 ใส่ as any ตรงอินเสิร์ตใหม่
      await supabase
        .from('auction_queues')
        .insert([{
          guild_id: session.profile.guild_id,
          user_id: session.profile.id,
          item_name: itemType,
          requested_qty: requestedQty,
          received_qty: 0,
          status: 'waiting',
          queue_timestamp: new Date().toISOString()
        }] as any)
    }

    revalidatePath('/')
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
    const today = new Date().toISOString().split('T')[0]

    const { data: todayItems } = await supabase
      .from('auction_sessions')
      .select('*')
      .eq('guild_id', session.profile.guild_id)
      .eq('session_date', today)
      .order('item_priority', { ascending: true })

    const { data: rawQueues } = await supabase
      .from('auction_queues')
      .select('*, profiles:user_id(display_name, uid_game)')
      .eq('guild_id', session.profile.guild_id)
      .in('status', ['waiting', 'partial'])
      .order('queue_timestamp', { ascending: true })

    const processedQueues = (rawQueues || []).map((q: any) => ({
      id: q.id,
      user_id: q.user_id,
      display_name: q.profiles?.display_name || 'ไม่ทราบชื่อ',
      uid_game: q.profiles?.uid_game || '-',
      item_type: q.item_name,
      requested_qty: q.requested_qty,
      received_qty: q.received_qty,
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
      .eq('id', id)
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
      .eq('id', id)

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
      .eq('id', id)

    if (error) throw error

    revalidatePath('/profile')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
