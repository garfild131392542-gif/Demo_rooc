'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Login user with email and password
 * Uses Supabase Auth standard signInWithPassword method
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns { success: boolean, error?: string }
 */
export async function loginAction(email: string, password: string) {
  try {
    if (!email || !password) {
      return { success: false, error: 'อีเมลและรหัสผ่านต้องไม่ว่าง' }
    }

    const supabase = await createClient()

    const identifier = email.trim()
    const finalEmail = identifier.includes('@')
      ? identifier.toLowerCase()
      : `${identifier.toLowerCase()}@member.rooc`

    const { data, error } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
      }
      if (error.message.includes('Email not confirmed')) {
        return { success: false, error: 'กรุณายืนยันอีเมลของคุณก่อน' }
      }
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: 'ไม่สามารถเข้าสู่ระบบได้' }
    }

    return { success: true, user: data.user }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
  }
}

/**
 * Register a new user with email and password
 * Uses Supabase Auth standard signUp method
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns { success: boolean, error?: string }
 */
export async function registerAction(email: string, password: string) {
  try {
    if (!email || !password) {
      return { success: false, error: 'อีเมลและรหัสผ่านต้องไม่ว่าง' }
    }

    // Basic password validation
    if (password.length < 6) {
      return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('already registered')) {
        return { success: false, error: 'อีเมลนี้ลงทะเบียนแล้ว' }
      }
      if (error.message.includes('Password')) {
        return { success: false, error: 'รหัสผ่านไม่บรรลุความต้องการ' }
      }
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: 'ไม่สามารถสมัครสมาชิกได้' }
    }

    // Check if email verification is required
    if (data.user.identities?.length === 0) {
      return {
        success: true,
        user: data.user,
        message: 'ตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี',
      }
    }

    return { success: true, user: data.user }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }
  }
}

/**
 * Get current user session
 * Uses Supabase Auth to retrieve the current user
 * 
 * @returns Session data with user and profile info, or null if not authenticated
 */
export async function getSession() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    // Get user profile information from the profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return {
      user: session.user,
      profile,
    }
  } catch (err: any) {
    console.error('Error getting session:', err.message)
    return null
  }
}

/**
 * Logout the current user
 * Signs out from Supabase Auth
 * 
 * @returns { success: boolean, error?: string }
 */
export async function logoutAction() {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการออกจากระบบ' }
  }
}