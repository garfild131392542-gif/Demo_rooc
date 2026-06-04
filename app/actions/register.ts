'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validatePasswordMatch,
} from '@/lib/validations'
import { sendWelcomeEmailAction } from './email'

// ลบ import GuildOwner ออกถ้าไม่ได้ใช้ในไฟล์นี้ เพื่อความคลีน

interface RegisterFormData {
  id?: string // ทำให้เป็น optional เพราะตอนส่งมาจากฟอร์มอาจจะยังไม่มี
  firstName: string // เปลี่ยนเป็น firstName ให้ตรงกับฟอร์มฝั่ง Frontend
  lastName: string  // เปลี่ยนเป็น lastName
  phone: string
  email: string
  password: string
  confirmPassword: string
}

interface RegisterResponse {
  success: boolean
  error?: string
  userId?: string
  guildId?: string
}

export async function registerAction(formData: RegisterFormData): Promise<RegisterResponse> {
  try {
    // Validate input
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error }
    }

    const phoneValidation = validatePhoneNumber(formData.phone)
    if (!phoneValidation.valid) {
      return { success: false, error: phoneValidation.error }
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error }
    }

    const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword)
    if (!passwordMatchValidation.valid) {
      return { success: false, error: passwordMatchValidation.error }
    }

    // Create auth user
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create account' }
    }

    const userId = authData.user.id

    // Create profile record in guild_owners 
    const adminClient = await createAdminClient()
    const { error: ownerError } = await (adminClient as any).from('guild_owners').insert([
      {
        id: userId,
        email: formData.email,
        first_name: formData.firstName, 
        last_name: formData.lastName,   
        phone_number: formData.phone,
      },
    ])

    if (ownerError) {
      console.error('Owner creation error:', ownerError)
      return { success: false, error: 'Failed to create account owner' }
    }

    

    // Send welcome email (non-blocking)
    try {
      const emailResult = await sendWelcomeEmailAction({
        email: formData.email,
        displayName: `${formData.firstName} ${formData.lastName}`,
        // 👇 เปลี่ยนจาก guildData.name เป็นชื่อระบบไปก่อน เพราะเขายังไม่ได้ตั้งชื่อกิลด์
        guildName: 'ระบบจัดการกิลด์ (Guild Management)', 
      })

      if (!emailResult.success) {
        console.warn('[WELCOME EMAIL WARNING]', emailResult.error)
      }
    } catch (emailError) {
      console.error('[WELCOME EMAIL ERROR]', emailError)
    }

    return {
      success: true,
      userId,
      // 👇 ลบ guildId ทิ้งไปเลย เพราะเรายังไม่มีข้อมูลนี้ในขั้นตอนนี้ครับ
    }
  } catch (error) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}