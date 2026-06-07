'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

export interface ProfileSetupFormData {
  displayName?: string
  display_name?: string
  uidGame?: string
  uid_game?: string
  jobName?: string
  job_name?: string
  inviteCode?: string | null
  invite_code?: string | null
}

// ==========================================
// อัปเดตสเตตัสของตัวละคร (จากหน้า My Profile)
// ==========================================
export async function updateMyProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()
  
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
  const p_def = parseInt(formData.get('p_def') as string) || 0
  const m_def = parseInt(formData.get('m_def') as string) || 0
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
      p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc,
      updated_at: new Date().toISOString() 
    } as any)
    .eq('id', (session as any).user?.id ?? (session as any).id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}

// ==========================================
// Setup Profile with Guild Selection (Profile Setup Page)
// Supports BOTH camelCase and snake_case properties from client
// ==========================================
export async function setupProfileAction(formData: ProfileSetupFormData) {
  try {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authData.user) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' }
    }
    const userId = authData.user.id

    // 🌟 พระเอกของงานนี้: ดึง Email จากระบบความปลอดภัยหลังบ้าน มาสกัดเป็น Username แบบอัตโนมัติ
    const userEmail = authData.user.email || ''
    const secureUidGame = userEmail.includes('@member.rooc')
      ? userEmail.split('@')[0]
      : (formData.uidGame || formData.uid_game || '') // Fallback เผื่อกรณีฉุกเฉิน

    const adminClient = await createAdminClient()

    const code = formData.inviteCode || formData.invite_code
    const finalDisplayName = formData.displayName || formData.display_name || ''
    const finalJobName = formData.jobName || formData.job_name || ''

    let assignedGuildId = null
    let assignedRole = 'member'
    let chosenPath = '/onboarding'

    if (code && code.trim() !== "") {
      const { data: foundGuild, error: guildError } = await (adminClient as any)
        .from('guilds')
        .select('id')
        .eq('invite_code', code.trim().toUpperCase())
        .maybeSingle()

      if (guildError) {
        console.error('Guild lookup error:', guildError)
        return { success: false, error: 'เกิดข้อผิดพลาดในการค้นหากิลด์' }
      }

      if (!foundGuild) {
        return { success: false, error: 'ไม่พบกิลด์ที่ใช้โค้ดเชิญนี้' }
      }

      assignedGuildId = foundGuild.id
      assignedRole = 'member'
      chosenPath = '/'
    }

    const { data: existingProfile } = await (adminClient as any)
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      // 🟢 กรณีอัปเดต: ใช้ secureUidGame ที่สกัดมาจากระบบหลังบ้าน บันทึกทับเพื่อกู้ข้อมูลคืนมา
      const { error: updateError } = await (adminClient as any)
        .from('profiles')
        .update({
          guild_id: assignedGuildId,
          role: assignedRole,
          display_name: finalDisplayName,
          uid_game: secureUidGame, // 🌟 ล็อกค่าให้ถูกต้องเสมอ ไม่โดนหน้าบ้านส่งค่าว่างมาทับแล้ว
          job_name: finalJobName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return { success: false, error: 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้' }
      }
    } else {
      // 🔵 กรณีผู้ใช้ใหม่
      const { error: insertError } = await (adminClient as any)
        .from('profiles')
        .insert([
          {
            id: userId,
            guild_id: assignedGuildId,
            role: assignedRole,
            display_name: finalDisplayName,
            uid_game: secureUidGame, // 🌟 ใช้ค่าที่สกัดมาเช่นกัน
            job_name: finalJobName,
            p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
            p_dmg: 0, m_dmg: 0, p_reduc: 0, m_reduc: 0,
            pvp_dmg: 0, pvp_reduc: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ])

      if (insertError) {
        console.error('Profile creation error:', insertError)
        return { success: false, error: 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้' }
      }
    }

    revalidatePath('/profile')
    revalidatePath('/')
    
    return { success: true, chosenPath }

  } catch (error) {
    console.error('Profile setup error:', error)
    return { success: false, error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด' }
  }
}

export async function createProfileSetupAction(formData: ProfileSetupFormData) {
  return setupProfileAction(formData)
}