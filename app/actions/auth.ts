'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// 💡 ดึงเอาประเภทข้อมูล (Types) ที่เราอุตส่าห์ทำไว้ใน Phase 2 มาสยบ TypeScript ครับ
import type { Profile, Admin } from '@/types/database'

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
  if (!email || !password) {
    return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ==========================================
// 2. เข้าสู่ระบบ (Login) - Phase 3
// ==========================================
export async function loginAction(email: string, password: string) {
  if (!email || !password) {
    return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
  }

  return { success: true }
}

// ==========================================
// 3. ออกจากระบบ (Logout)
// ==========================================
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