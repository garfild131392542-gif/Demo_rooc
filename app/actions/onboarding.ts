'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendWelcomeEmailAction } from './email' 

export interface OnboardingFormData {
  guildName: string
  guildUrl: string
  guildDescription: string
  discordLink?: string // รองรับข้อมูลลิงก์ Discord จากหน้าบ้าน
  contactEmail: string 
}

const GUILD_URL_REGEX = /^[a-z0-9-]+$/

export async function validateGuildUrlAction(
  guildUrl: string
): Promise<{ available: boolean; error?: string }> {
  try {
    if (!guildUrl || !GUILD_URL_REGEX.test(guildUrl)) {
      return { 
        available: false, 
        error: 'URL ไม่ถูกต้อง (ใช้ได้แค่ a-z, 0-9 และเครื่องหมาย - เท่านั้น)' 
      }
    }
    
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('guilds')
      .select('id')
      .eq('guild_url', guildUrl)
      .maybeSingle()

    if (error) {
      console.error('Guild URL validation error:', error)
      return { available: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' }
    }

    const available = !data
    return { available }
    
  } catch (error) {
    console.error('Validation error:', error)
    return { available: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบ' }
  }
}

export async function completeOnboardingAction(
  formData: OnboardingFormData
): Promise<{ success: boolean; error?: string; inviteLink?: string }> {
  try {
    const urlValidation = await validateGuildUrlAction(formData.guildUrl)
    if (!urlValidation.available) {
      return { success: false, error: 'This guild URL is no longer available' }
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return { success: false, error: 'User session not found' }
    }
    const userId = authData.user.id
    
    // ดึงค่า Email จากระบบ Auth เพื่อนำมาสกัดเป็น Username ล็อกอิน
    const userEmail = authData.user.email || ''
    const extractedUsername = userEmail.includes('@member.rooc')
      ? userEmail.split('@')[0]
      : userEmail

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14) 
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase() 

    const adminClient = await createAdminClient()
    const { data: newGuild, error: insertError } = await (adminClient as any)
      .from('guilds')
      .insert([
        {
          owner_id: userId,
          name: formData.guildName.trim(),
          guild_url: formData.guildUrl.trim().toLowerCase(),
          description: formData.guildDescription.trim(), 
          status: 'active', 
          invite_code: inviteCode,
          trial_ends_at: trialEndsAt.toISOString(),
          contact_email: formData.contactEmail.trim(),
          // 🌟 เพิ่มการแมปข้อมูล discord_link ลงฐานข้อมูลตรงนี้ครับ (ถ้าไม่มีส่งค่ามาจะบันทึกเป็น null)
          discord_link: formData.discordLink ? formData.discordLink.trim() : null
        }
      ])
      .select('id')
      .single()

    if (insertError || !newGuild) {
      console.error('Guild creation error:', insertError)
      return { success: false, error: 'Failed to create guild' }
    }

    // 5. เชื่อมโยง Profile เข้ากับ Guild, ปรับสิทธิ์เป็น admin และบันทึกค่า uid_game ที่สกัดได้ลงฐานข้อมูล
    const { error: profileUpdateError } = await (adminClient as any)
      .from('profiles')
      .update({ 
        guild_id: newGuild.id, 
        role: 'admin',
        uid_game: extractedUsername // เพิ่มการส่งข้อมูลเพื่อป้องกันค่า EMPTY ในตาราง profiles
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('Error linking profile to guild:', profileUpdateError)
      return { success: false, error: 'สร้างกิลด์สำเร็จ แต่เกิดข้อผิดพลาดในการเชื่อมโยงโปรไฟล์' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/g/${formData.guildUrl}`

    try {
      if (formData.contactEmail) {
        await sendWelcomeEmailAction({
          email: formData.contactEmail,
          displayName: `${formData.guildName} Admin`, 
          guildName: formData.guildName,
          guildUrl: formData.guildUrl,
        })
      }
    } catch (emailError) {
      console.error('[WELCOME EMAIL ERROR during onboarding]', emailError)
    }

    return {
      success: true,
      inviteLink,
    }
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}