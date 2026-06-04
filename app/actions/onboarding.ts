'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendWelcomeEmailAction } from './email' 

export interface OnboardingFormData {
  guildName: string
  guildUrl: string
  guildDescription: string
  discordLink?: string
  facebookLink?: string
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
    // 2. เช็คใน Database ว่ามี URL นี้ถูกใช้งานไปหรือยัง
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('guilds')
      .select('id')
      .eq('guild_url', guildUrl)
      .single()

    // 💡 ทริคของ Supabase: ถ้า error.code เป็น 'PGRST116' แปลว่าหาข้อมูลไม่เจอ 
    // ซึ่งในกรณีของการเช็คชื่อซ้ำ "หาไม่เจอ = ข่าวดี (ชื่อนี้ว่าง!)" ครับ
    if (error && error.code !== 'PGRST116') {
      console.error('Guild URL validation error:', error)
      return { available: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' }
    }

    // ถ้า data มีค่า แปลว่ามีคนใช้ชื่อนี้ไปแล้ว (available = false)
    // ถ้า data ไม่มีค่า แปลว่าชื่อนี้ยังว่างอยู่ (available = true)
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
    // 1. เช็คความพร้อมของ URL กิลด์อีกรอบ
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

    // 4. 🚀 สร้างกิลด์ใหม่ (INSERT) ลงในตาราง guilds
    const adminClient = await createAdminClient()
    const { data: newGuild, error: insertError } = await (adminClient as any)
      .from('guilds')
      .insert([
        {
          owner_id: userId,
          name: formData.guildName,
          guild_url: formData.guildUrl,
          server_name: formData.guildDescription || formData.guildName, // ใช้ Description เป็น server_name ตามที่ฟอร์มออกแบบมา
          status: 'active', // อนุมัติใช้งานทันที
          invite_code: inviteCode,
          trial_ends_at: trialEndsAt.toISOString(),
        }
      ])
      .select('id')
      .single()

    if (insertError || !newGuild) {
      console.error('Guild creation error:', insertError)
      return { success: false, error: 'Failed to create guild' }
    }

    // 5. สร้างลิงก์เชิญเพื่อส่งกลับไปให้หน้า Frontend และส่งอีเมล
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/g/${formData.guildUrl}`

    // 6. 📧 ส่งอีเมลต้อนรับ 📧
    try {
      const { data: ownerData } = await supabase
        .from('guild_owners')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single()

      if (ownerData?.email) {
        await sendWelcomeEmailAction({
          email: ownerData.email,
          displayName: `${ownerData.first_name} ${ownerData.last_name}`,
          guildName: formData.guildName,
          guildUrl: formData.guildUrl,
        })
      }
    } catch (emailError) {
      console.error('[WELCOME EMAIL ERROR during onboarding]', emailError)
      // ปล่อยผ่านไป ไม่ต้องให้ระบบพังถ้าอีเมลส่งไม่ไป
    }

    // 7. ส่งผลลัพธ์กลับไปให้ Component OnboardingForm
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