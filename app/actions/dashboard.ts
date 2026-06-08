'use server'

import { createAdminClient } from '@/lib/supabase/server' 
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function updateProfileParty(
  profileId: string, 
  partyId: number | null, 
  slotIndex: number | null
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

  const { error } = await (supabaseAdmin as any)
    .from('profiles')
    .update({ 
      party_id: partyId,
      slot_index: slotIndex 
    } as any)
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