'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, role')
    .eq('id', session.id)
    .maybeSingle()

  if (error || !admin) {
    throw new Error('Unauthorized')
  }

  return admin
}

// ---- Members CRUD ----
export async function createMember(formData: FormData) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const uid_game = formData.get('uid_game') as string
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  const role = formData.get('role') as 'admin' | 'member'
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
  const p_def = parseInt(formData.get('p_def') as string) || 0
  const m_def = parseInt(formData.get('m_def') as string) || 0
  const p_atk = parseInt(formData.get('p_atk') as string) || 0
  const m_atk = parseInt(formData.get('m_atk') as string) || 0
  const p_dmg = parseInt(formData.get('p_dmg') as string) || 0
  const m_dmg = parseInt(formData.get('m_dmg') as string) || 0
  const p_reduc = parseInt(formData.get('p_reduc') as string) || 0
  const m_reduc = parseInt(formData.get('m_reduc') as string) || 0

  const { error } = await supabase
    .from('profiles')
    .insert([{ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg, p_def, m_def, last_stat_update: new Date().toISOString() }])

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function updateMember(id: string, formData: FormData) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const uid_game = formData.get('uid_game') as string
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  const role = formData.get('role') as 'admin' | 'member'
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
  const p_def = parseInt(formData.get('p_def') as string) || 0
  const m_def = parseInt(formData.get('m_def') as string) || 0

  const { error } = await supabase
    .from('profiles')
    .update({ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg, p_def, m_def, last_stat_update: new Date().toISOString() } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMember(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

// ---- Credentials ----
export async function resetMemberPassword(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ password_game: null } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  return { success: true }
}

export async function clearMemberParty(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      party_id: null,
      slot_index: null // หรือชื่อคอลัมน์ตำแหน่งในปาร์ตี้ของคุณ
    } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function changeMemberRole(id: string, newRole: 'admin' | 'member') {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function toggleMemberLeave(id: string, is_on_leave: boolean) {
  try {
    await checkAdmin()
    const supabase = await createAdminClient()

    // ล้างค่าปาร์ตี้และตำแหน่งทันทีเมื่อกดลา
    const updateData: any = { is_on_leave };
    if (is_on_leave === true) {
      updateData.party_id = null;
      updateData.slot_index = null;
    }

    // เพิ่ม .select() เพื่อให้ Supabase คืนข้อมูลแถวที่ถูกอัปเดตกลับมา
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select() 

    if (error) return { success: false, error: error.message }
    
    // ดักจับ Silent Failure (อัปเดตไม่ได้เพราะติด RLS)
    if (!data || data.length === 0) {
      return { success: false, error: "อัปเดตไม่สำเร็จ: ข้อมูลอาจถูกบล็อกด้วยระบบ Security (RLS)" }
    }

    revalidatePath('/admin/credentials')
    revalidatePath('/')
    return { success: true }
    
  } catch (e: any) {
    return { success: false, error: e.message || "เกิดข้อผิดพลาดในระบบหลังบ้าน" }
  }
}

// ---- Guild Approval System ----
/**
 * ดึงข้อมูลกิลด์ที่รอการอนุมัติ (status = 'pending')
 */
export async function getPendingGuilds() {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('guilds')
    .select('id, name, server_name, owner_id, status, created_at, profiles:owner_id(display_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending guilds:', error)
    return { success: false, error: error.message, guilds: [] }
  }

  return { success: true, guilds: data || [] }
}

/**
 * อนุมัติกิลด์ - เปลี่ยนสถานะจาก 'pending' เป็น 'active'
 */
export async function approveGuild(guildId: string) {
  try {
    await checkAdmin()
    const supabase = await createAdminClient()

    // ตรวจสอบว่ากิลด์มีอยู่และอยู่ในสถานะ 'pending'
    const { data: guild, error: fetchError } = await supabase
      .from('guilds')
      .select('id, owner_id, status')
      .eq('id', guildId)
      .single()

    if (fetchError || !guild) {
      return { success: false, error: 'กิลด์ไม่พบ' }
    }

    if (guild.status !== 'pending') {
      return { success: false, error: `กิลด์มีสถานะ ${guild.status} ไม่สามารถอนุมัติได้` }
    }

    // อัปเดตสถานะเป็น 'active'
    const { error: updateError } = await supabase
      .from('guilds')
      .update({ status: 'active', approved_at: new Date().toISOString() })
      .eq('id', guildId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // อัปเดตโปรไฟล์เจ้าของให้ผูกกับ guild ที่อนุมัติแล้ว
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ guild_id: guild.id, role: 'guild_master' })
      .eq('id', guild.owner_id)

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    revalidatePath('/admin/dashboard')
    return { success: true, message: 'อนุมัติกิลด์สำเร็จ' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * ปฏิเสธกิลด์ - ลบกิลด์ออกจากระบบหรือเปลี่ยนสถานะเป็น 'rejected'
 */
export async function rejectGuild(guildId: string, reason?: string) {
  try {
    await checkAdmin()
    const supabase = await createAdminClient()

    // ตรวจสอบว่ากิลด์มีอยู่และอยู่ในสถานะ 'pending'
    const { data: guild, error: fetchError } = await supabase
      .from('guilds')
      .select('id, status')
      .eq('id', guildId)
      .single()

    if (fetchError || !guild) {
      return { success: false, error: 'กิลด์ไม่พบ' }
    }

    if (guild.status !== 'pending') {
      return { success: false, error: `กิลด์มีสถานะ ${guild.status} ไม่สามารถปฏิเสธได้` }
    }

    // เปลี่ยนสถานะเป็น 'rejected' พร้อมเหตุผล
    const { error: updateError } = await supabase
      .from('guilds')
      .update({ 
        status: 'rejected', 
        rejection_reason: reason || 'ไม่ระบุเหตุผล',
        rejected_at: new Date().toISOString() 
      })
      .eq('id', guildId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath('/admin/dashboard')
    return { success: true, message: 'ปฏิเสธกิลด์สำเร็จ' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}