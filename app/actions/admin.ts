'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

/**
 * [LAYER A] สำหรับ Super Admin (ผู้ดูแลระบบสูงสุดของเว็บ)
 * ใช้ตรวจสอบสิทธิ์ในการ อนุมัติ/ปฏิเสธ การสร้างกิลด์ในระบบ
 */
async function checkSuperAdmin() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized: No session found')
  }

  const supabase = await createClient()
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error || !admin) {
    throw new Error('Unauthorized: Super Admin access required')
  }

  return admin
}

/**
 * [LAYER B] สำหรับ Guild Admin (หัวหน้ากิลด์แต่ละกิลด์) - ตรวจสอบหลายชั้น (Multi-layered)
 * ป้องกันไม่ให้ Member ทั่วไปเข้าถึง และจำกัดให้แอดมินเห็นเฉพาะข้อมูลภายในกิลด์ของตนเองเท่านั้น
 */
async function checkGuildAdmin() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized: No session found')
  }

  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, guild_id, role')
    .eq('id', session.user.id)
    .maybeSingle()

  // ตรวจสอบความปลอดภัยระดับชั้น: ต้องเป็นโพรไฟล์จริง + มีตำแหน่งเป็น admin + มีการสังกัดกิลด์เรียบร้อย
  if (error || !profile || profile.role !== 'admin' || !profile.guild_id) {
    throw new Error('Unauthorized: Guild Admin access denied or missing guild assignment')
  }

  return profile // คืนค่า { id, guild_id, role } ของแอดมินกิลด์นั้นๆ
}

// ==========================================
// ---- Guild Members CRUD (สิทธิ์ Guild Admin) ----
// ==========================================

export async function createMember(formData: FormData) {
  try {
    // 1. ตรวจสอบสิทธิ์แบบหนาแน่นและดึงค่า guild_id ของแอดมินปัจจุบันมาล็อกค่าไว้
    const admin = await checkGuildAdmin()
    const supabase = await createAdminClient()

    const uid_game = formData.get('uid_game') as string
    const display_name = formData.get('display_name') as string
    const job_name = formData.get('job_name') as string
    const role = formData.get('role') as 'admin' | 'member'
    
    const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
    const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
    const p_def = parseInt(formData.get('p_def') as string) || 0
    const m_def = parseInt(formData.get('m_def') as string) || 0
    
    // FIXED: ดึงข้อมูลสเตตัสเพิ่มเติมตามฟอร์มจริง
    const p_atk = parseInt(formData.get('p_atk') as string) || 0
    const m_atk = parseInt(formData.get('m_atk') as string) || 0
    const p_dmg = parseInt(formData.get('p_dmg') as string) || 0
    const m_dmg = parseInt(formData.get('m_dmg') as string) || 0
    const p_reduc = parseInt(formData.get('p_reduc') as string) || 0
    const m_reduc = parseInt(formData.get('m_reduc') as string) || 0

    // 2. สั่งบันทึกข้อมูล โดยระบบจะบังคับใส่ guild_id ของแอดมินลงไปด้วยโดยอัตโนมัติ เพื่อแยกกิลด์ชัดเจน
    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          guild_id: admin.guild_id, // ผูกเข้ากับกิลด์ของแอดมินผู้สร้างทันที
          uid_game,
          display_name,
          job_name,
          role,
          p_atk,
          m_atk,
          p_def,
          m_def,
          p_dmg,
          m_dmg,
          p_reduc,
          m_reduc,
          pvp_reduc,
          pvp_dmg,
          last_stat_update: new Date().toISOString(),
        }
      ] as any)

    if (error) return { success: false, error: error.message }

    revalidatePath('/guild-admin/credentials')
    revalidatePath('/members')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateMember(id: string, formData: FormData) {
  try {
    const admin = await checkGuildAdmin()
    const supabase = await createAdminClient()

    // Layer Check เพิ่มเติม: ตรวจสอบว่าผู้ใช้งานที่จะแก้ไข อยู่ในกิลด์เดียวกับแอดมินจริงไหม ป้องกันการแฮกเปลี่ยน ID ผ่านหน้าบ้าน
    const { data: targetMember } = await supabase.from('profiles').select('guild_id').eq('id', id).single()
    if (!targetMember || targetMember.guild_id !== admin.guild_id) {
      return { success: false, error: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลสมาชิกข้ามกิลด์' }
    }

    const uid_game = formData.get('uid_game') as string
    const display_name = formData.get('display_name') as string
    const job_name = formData.get('job_name') as string
    const role = formData.get('role') as 'admin' | 'member'
    
    const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
    const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
    const p_def = parseInt(formData.get('p_def') as string) || 0
    const m_def = parseInt(formData.get('m_def') as string) || 0
    
    // FIXED: เพิ่มการดักรับและอัปเดตสเตตัสที่ขาดหายไปในโค้ดเดิม ให้บันทึกเข้า Database ครบถ้วน
    const p_atk = parseInt(formData.get('p_atk') as string) || 0
    const m_atk = parseInt(formData.get('m_atk') as string) || 0
    const p_dmg = parseInt(formData.get('p_dmg') as string) || 0
    const m_dmg = parseInt(formData.get('m_dmg') as string) || 0
    const p_reduc = parseInt(formData.get('p_reduc') as string) || 0
    const m_reduc = parseInt(formData.get('m_reduc') as string) || 0

    const { error } = await (supabase as any)
      .from('profiles')
      .update({ 
        uid_game, 
        display_name, 
        job_name, 
        role, 
        p_atk,
        m_atk,
        p_def,
        m_def,
        p_dmg,
        m_dmg,
        p_reduc,
        m_reduc,
        pvp_reduc, 
        pvp_dmg, 
        last_stat_update: new Date().toISOString() 
      } as any)
      .eq('id', id)
      .eq('guild_id', admin.guild_id) // ซ้ำการล็อกขอบเขตกิลด์เพื่อความปลอดภัยสูงสุด

    if (error) return { success: false, error: error.message }

    revalidatePath('/guild-admin/credentials')
    revalidatePath('/members')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteMember(id: string) {
  try {
    const admin = await checkGuildAdmin()
    const supabase = await createAdminClient()

    // ลบข้อมูลโดยกั้นสิทธิ์ตาม ID สมาชิก และกิลด์ไอดีของแอดมินคู่กันเสมอ
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('guild_id', admin.guild_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/guild-admin/credentials')
    revalidatePath('/members')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// ---- ระบบบริหารรหัสผ่านกิลด์ (สิทธิ์ Guild Admin) ----
// ==========================================

/**
 * 🌟 ฟังก์ชันจัดการรีเซ็ตรหัสผ่านสำหรับระบบ Virtual Email บัญชีผู้เล่นทั่วไป
 * โดยทำการข้ามสิทธิ์ RLS ไปแก้ไขข้อมูลหลังบ้านด้วยรหัสผ่านใหม่ชั่วคราว
 */
export async function resetMemberPassword(userId: string, newPassword: string) {
  try {
    const admin = await checkGuildAdmin()
    const supabase = await createAdminClient()

    // ขั้นตรวจสอบความปลอดภัยขั้นสูงสุด: ตรวจสอบข้อมูลว่าสมาชิกที่จะเปลี่ยนรหัสผ่าน สังกัดอยู่กิลด์เดียวกับแอดมินผู้กดจริงหรือไม่
    const { data: targetMember } = await supabase
      .from('profiles')
      .select('guild_id')
      .eq('id', userId)
      .maybeSingle()

    if (!targetMember || targetMember.guild_id !== admin.guild_id) {
      return { success: false, error: 'ปฏิเสธสิทธิ์: คุณไม่มีอำนาจจัดการรหัสผ่านของสมาชิกกิลด์อื่น' }
    }

    // เรียกใช้ระบบบจัดการผู้ใช้ระดับคอร์หลักของ Supabase Auth เพื่อ Override รหัสผ่านใหม่
    const { error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/guild-admin/credentials')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการประมวลผล' }
  }
}

export async function toggleMemberLeave(id: string, is_on_leave: boolean) {
  try {
    const admin = await checkGuildAdmin()
    const supabase = await createAdminClient()

    const updateData: any = { is_on_leave };
    if (is_on_leave === true) {
      updateData.party_id = null;
      updateData.slot_index = null;
    }

    const { data, error } = await (supabase as any)
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('guild_id', admin.guild_id) // ล็อกขอบเขตกิลด์
      .select() 

    if (error) return { success: false, error: error.message }
    if (!data || data.length === 0) {
      return { success: false, error: "อัปเดตไม่สำเร็จ: ข้อมูลอยู่นอกเหนือสิทธิ์การจัดการของกิลด์คุณ" }
    }

    revalidatePath('/guild-admin/credentials')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || "เกิดข้อผิดพลาดในระบบหลังบ้าน" }
  }
}

// ==========================================
// ---- Guild Approval System (สิทธิ์ Super Admin เท่านั้น) ----
// ==========================================

export async function getPendingGuilds() {
  await checkSuperAdmin() // ใช้ระบบตรวจสอบระดับเว็บสูงสุด
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

export async function approveGuild(guildId: string) {
  try {
    await checkSuperAdmin()
    const supabase = await createAdminClient()

    const { data: guild, error: fetchError } = await (supabase as any)
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

    const { error: updateError } = await (supabase as any)
      .from('guilds')
      .update({ status: 'active', approved_at: new Date().toISOString() } as any)
      .eq('id', guildId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .update({ guild_id: (guild as any).id, role: 'admin' } as any) // ปรับโครงสร้างให้อัปเดตเป็น admin ตามระบบกิลด์ของคุณ
      .eq('id', guild.owner_id)

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    revalidatePath('/admin/')
    return { success: true, message: 'อนุมัติกิลด์สำเร็จ' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function rejectGuild(guildId: string, reason?: string) {
  try {
    await checkSuperAdmin()
    const supabase = await createAdminClient()

    const { data: guild, error: fetchError } = await (supabase as any)
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

    const { error: updateError } = await (supabase as any)
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

    revalidatePath('/admin')
    return { success: true, message: 'ปฏิเสธกิลด์สำเร็จ' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}