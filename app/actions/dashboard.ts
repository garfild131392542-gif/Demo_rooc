'use server'

import { createAdminClient } from '@/lib/supabase/server' 
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function updateProfileParty(
  profileId: string, 
  partyId: number | null, 
  slotIndex: number | null,
  activity: 'general' | 'guild_league' | 'emperium_overrun' = 'general'
) {
  const session = (await getSession()) as any
  const role = session?.profile?.role
  const adminGuildId = session?.profile?.guild_id

  // 🌟 เช็คสิทธิ์ว่าผู้ทำรายการเป็น admin และต้องสังกัดกิลด์ด้วย
  if (role !== 'admin' || !adminGuildId) {
    return { success: false, error: 'Unauthorized' }
  }

  // 🌟 ใช้ Admin Client เพื่อทำการข้าม RLS ให้เฉพาะเจ้าหน้าที่จัดการได้กวดขัน
  const supabaseAdmin = await createAdminClient()

  const updateFields: any = {}
  if (activity === 'guild_league') {
    updateFields.party_id_guild_league = partyId
    updateFields.slot_index_guild_league = slotIndex
  } else if (activity === 'emperium_overrun') {
    updateFields.party_id_emperium_overrun = partyId
    updateFields.slot_index_emperium_overrun = slotIndex
  } else {
    updateFields.party_id = partyId
    updateFields.slot_index = slotIndex
  }

  const { error } = await (supabaseAdmin as any)
    .from('profiles')
    .update(updateFields)
    .eq('id', profileId)
    .eq('guild_id', adminGuildId) // 🔐 ล็อกว่าสมาชิกคนที่จะโดนย้ายปาร์ตี้ ต้องอยู่กิลด์เดียวกับแอดมินคนนี้เท่านั้น

  if (error) {
    console.error("Dashboard update error:", error)
    return { success: false, error: error.message }
  }

  // สั่งเคลียร์ Cache หน้าแรก เพื่อให้ทุกเบราว์เซอร์อัปเดตตำแหน่งการจัดปาร์ตี้ใหม่พร้อมกันทันที
  revalidatePath('/')
  
  return { success: true }
}

export type PartyAssignmentUpdate = {
  profileId: string
  partyId: number | null
  slotIndex: number | null
}

/**
 * 🌟 สลับตำแหน่งปาร์ตี้ 2 คนพร้อมกัน หรือย้ายสมาชิกคนเดียวแบบ Atomic ใน 1 Request
 */
export async function swapPartyMembers(
  sourceId: string,
  occupantId: string | null,
  targetPartyId: number | null,
  targetSlotIndex: number | null,
  activity: 'general' | 'guild_league' | 'emperium_overrun' = 'general'
) {
  const session = (await getSession()) as any
  const role = session?.profile?.role
  const adminGuildId = session?.profile?.guild_id

  if (role !== 'admin' || !adminGuildId) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabaseAdmin = await createAdminClient()

  // ⚡ 1. ลองเรียกผ่าน Atomic RPC Function ก่อน
  try {
    const { data: rpcRes, error: rpcErr } = await (supabaseAdmin as any).rpc('swap_party_members', {
      p_guild_id: adminGuildId,
      p_source_id: sourceId,
      p_occupant_id: occupantId || null,
      p_target_party: targetPartyId,
      p_target_slot: targetSlotIndex,
      p_activity: activity,
    })

    if (!rpcErr && rpcRes && rpcRes.success) {
      revalidatePath('/')
      return { success: true }
    }
  } catch (rpcErr) {
    console.warn('RPC swap_party_members fallback:', rpcErr)
  }

  // 🛡️ 2. Fallback Parallel Execution
  const promises = []

  if (occupantId) {
    const occupantFields: any = {}
    if (activity === 'guild_league') {
      occupantFields.party_id_guild_league = null
      occupantFields.slot_index_guild_league = null
    } else if (activity === 'emperium_overrun') {
      occupantFields.party_id_emperium_overrun = null
      occupantFields.slot_index_emperium_overrun = null
    } else {
      occupantFields.party_id = null
      occupantFields.slot_index = null
    }

    promises.push(
      (supabaseAdmin as any)
        .from('profiles')
        .update(occupantFields)
        .eq('id', occupantId)
        .eq('guild_id', adminGuildId)
    )
  }

  const sourceFields: any = {}
  if (activity === 'guild_league') {
    sourceFields.party_id_guild_league = targetPartyId
    sourceFields.slot_index_guild_league = targetSlotIndex
  } else if (activity === 'emperium_overrun') {
    sourceFields.party_id_emperium_overrun = targetPartyId
    sourceFields.slot_index_emperium_overrun = targetSlotIndex
  } else {
    sourceFields.party_id = targetPartyId
    sourceFields.slot_index = targetSlotIndex
  }

  promises.push(
    (supabaseAdmin as any)
      .from('profiles')
      .update(sourceFields)
      .eq('id', sourceId)
      .eq('guild_id', adminGuildId)
  )

  const results = await Promise.all(promises)
  const hasError = results.find(r => r.error)

  if (hasError) {
    console.error('swapPartyMembers error:', hasError.error)
    return { success: false, error: hasError.error.message }
  }

  revalidatePath('/')
  return { success: true }
}