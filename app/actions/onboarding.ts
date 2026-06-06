'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendWelcomeEmailAction } from './email' 

// กำหนดให้ contactEmail เป็นฟิลด์ที่จำเป็น (Required) เนื่องจากถูกบังคับในขั้นตอน Onboarding แล้ว
export interface OnboardingFormData {
  guildName: string
  guildUrl: string
  guildDescription: string
  discordLink?: string
  contactEmail: string 
}

const GUILD_URL_REGEX = /^[a-z0-9-]+$/

export async function validateGuildUrlAction(
  guildUrl: string
): Promise<{ available: boolean; error?: string }> {
  try {
    // 1. ตรวจสอบรูปแบบ URL ด้วย Regex พื้นฐาน (ต้องเป็น a-z, 0-9 และ - เท่านั้น)
    if (!guildUrl || !GUILD_URL_REGEX.test(guildUrl)) {
      return { 
        available: false, 
        error: 'URL ไม่ถูกต้อง (ใช้ได้แค่ a-z, 0-9 และเครื่องหมาย - เท่านั้น)' 
      }
    }
    
    // 2. ตรวจสอบใน Database ว่ามี URL นี้ถูกใช้งานไปหรือยัง
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
    // 1. ตรวจสอบความพร้อมของ URL กิลด์อีกรอบ
    const urlValidation = await validateGuildUrlAction(formData.guildUrl)
    if (!urlValidation.available) {
      return { success: false, error: 'This guild URL is no longer available' }
    }

    const supabase = await createClient()

    // 2. ดึงข้อมูล User ปัจจุบัน
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return { success: false, error: 'User session not found' }
    }
    const userId = authData.user.id

    // 3. เตรียมข้อมูลสำหรับสร้างกิลด์
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14) // ทดลองใช้ 14 วัน
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase() // สุ่มรหัสเชิญ

    // 4. สร้างกิลด์ใหม่ (INSERT) ลงในตาราง guilds
    const adminClient = await createAdminClient()
    const { data: newGuild, error: insertError } = await (adminClient as any)
      .from('guilds')
      .insert([
        {
          owner_id: userId,
          name: formData.guildName,
          guild_url: formData.guildUrl,
          server_name: formData.guildDescription || formData.guildName, 
          status: 'active', 
          invite_code: inviteCode,
          trial_ends_at: trialEndsAt.toISOString(),
          contact_email: formData.contactEmail // แก้ไขการอ้างอิงจาก input เป็น formData
        }
      ])
      .select('id')
      .single()

    if (insertError || !newGuild) {
      console.error('Guild creation error:', insertError)
      return { success: false, error: 'Failed to create guild' }
    }

    // 5. เชื่อมโยง Profile เข้ากับ Guild และปรับสิทธิ์เป็น admin
    const { error: profileUpdateError } = await (adminClient as any)
      .from('profiles')
      .update({ 
        guild_id: newGuild.id, 
        role: 'admin' 
      })
      .eq('id', userId)

    if (profileUpdateError) {
      console.error('Error linking profile to guild:', profileUpdateError)
      return { success: false, error: 'สร้างกิลด์สำเร็จ แต่เกิดข้อผิดพลาดในการเชื่อมโยงโปรไฟล์' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/g/${formData.guildUrl}`

    // 6. ส่งอีเมลต้อนรับไปยังอีเมลติดต่อ (Contact Email) ที่ระบุไว้โดยตรง
    try {
      if (formData.contactEmail) {
        await sendWelcomeEmailAction({
          email: formData.contactEmail,
          displayName: `${formData.guildName} Admin`, // ใช้ชื่อกิลด์พ่วงตำแหน่งทดแทนชื่อจริงที่นำออกไป
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