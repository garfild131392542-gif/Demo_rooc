'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'



export async function updateMyProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  export interface ProfileSetupFormData {
  guildId?: string 
  displayName: string
  // 💡 Note: เนื่องจากตาราง profiles ของคุณมีพวกสเตตัสด้วย (p_atk, p_def ฯลฯ) 
  // ตอน Insert สร้างครั้งแรก มันอาจจะต้องกำหนดค่า Default ให้มันเป็น 0 ไว้ด้วยนะครับ (เดี๋ยวเราไปจัดการในฟังก์ชันได้)
}

  const supabase = await createClient()
  
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  
  // ของเดิม
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
  const p_def = parseInt(formData.get('p_def') as string) || 0
  const m_def = parseInt(formData.get('m_def') as string) || 0

  // 👇 สิ่งที่เพิ่มเข้ามาใหม่ 6 ค่า 👇
  const p_atk = parseInt(formData.get('p_atk') as string) || 0
  const m_atk = parseInt(formData.get('m_atk') as string) || 0
  const p_dmg = parseFloat(formData.get('p_dmg') as string) || 0
  const m_dmg = parseFloat(formData.get('m_dmg') as string) || 0
  const p_reduc = parseFloat(formData.get('p_reduc') as string) || 0
  const m_reduc = parseFloat(formData.get('m_reduc') as string) || 0
  
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ 
      display_name, job_name, 
      pvp_reduc, pvp_dmg, p_def, m_def,
      p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc, // <- อย่าลืมใส่ตัวแปรลงไปตรงนี้ด้วย
      updated_at: new Date().toISOString() 
    } as any)
    .eq('id', (session as any).user?.id ?? (session as any).id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}

export async function createProfileSetupAction(formData: ProfileSetupFormData) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authData.user) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' }
    }
    const userId = authData.user.id

    const adminClient = await createAdminClient()

    // 1. 🔍 ตรวจสอบว่า User คนนี้เป็น "เจ้าของกิลด์" หรือไม่?
    const { data: ownedGuild } = await (adminClient as any)
      .from('guilds')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()

    // 2. 🎯 กำหนด Role และ Guild ID อัตโนมัติ
    let assignedRole = 'member'
    let assignedGuildId = null

    if (ownedGuild) {
      assignedRole = 'admin'
      assignedGuildId = ownedGuild.id
    } else {
      assignedRole = 'member'
      assignedGuildId = formData.guildId 
    }

    if (!assignedGuildId) {
       return { success: false, error: 'ไม่พบข้อมูลกิลด์ กรุณาลองใหม่อีกครั้ง' }
    }

    // 3. 📝 บันทึกลงตาราง profiles (ใส่ค่า Default สเตตัสเป็น 0 ไปก่อนสำหรับการสร้างครั้งแรก)
    const { error: insertError } = await (adminClient as any)
      .from('profiles')
      .insert([
        {
          id: userId,
          guild_id: assignedGuildId,
          role: assignedRole,
          display_name: formData.displayName,
          job_name: 'Novice', // ตัวอย่าง: อาชีพเริ่มต้น
          pvp_reduc: 0,
          pvp_dmg: 0,
          p_def: 0,
          m_def: 0,
          p_atk: 0,
          m_atk: 0,
          p_dmg: 0,
          m_dmg: 0,
          p_reduc: 0,
          m_reduc: 0,
          updated_at: new Date().toISOString(),
        }
      ])

    if (insertError) {
      console.error('Profile creation error:', insertError)
      return { success: false, error: 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้' }
    }

    return { success: true }

  } catch (error) {
    console.error('Profile setup error:', error)
    return { success: false, error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' }
  }
}