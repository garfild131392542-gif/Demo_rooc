'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// 💡 ดึงเอาประเภทข้อมูล (Types) ที่เราอุตส่าห์ทำไว้ใน Phase 2 มาสยบ TypeScript ครับ
import type { Profile, Admin } from '@/types/database'

/**
 * Get current user session with profile data
 * Returns null if no user is logged in
 */
export async function getSession() {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return null
    }

    // Fetch user's profile data
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    return {
      user: session.user,
      profile: profile || null,
    }
  } catch (err) {
    return null
  }
}

/**
 * Login user with email and password
 * Uses Supabase Auth standard signInWithPassword method
 * * @param email - User's email address
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
 * Applies virtual email trick: if email has no @, append @member.rooc
 * * @param email - User's email address or username
 * @param password - User's password
 * @returns { success: boolean, error?: string, user?: any }
 */
export async function registerAction(email: string, password: string) {
  if (!email || !password) {
    return { success: false, error: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' }
  }

  const supabase = await createClient()

  // Apply virtual email trick: if no @ symbol, append @member.rooc
  const identifier = email.trim()
  const finalEmail = identifier.includes('@')
    ? identifier.toLowerCase()
    : `${identifier.toLowerCase()}@member.rooc`

  // Step 1: Create auth user (ระบบ Authentication)
  const { data, error } = await supabase.auth.signUp({
    email: finalEmail,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user?.id) {
    return { success: false, error: 'ไม่สามารถสร้างบัญชีได้' }
  }

  // ✂️ REFACTORED: ลบ Step 2 (การสร้าง Profile) ออกจากตรงนี้ทั้งหมด! ✂️
  // เพื่อป้องกันปัญหาข้อมูล Profile ตีกัน (Conflict)
  // ให้ระบบไปบังคับสร้าง Profile ตอนที่ User เข้าหน้า /profile-setup แทน (ผ่านไฟล์ profile.ts)

  // Return success on successful signup (no profile creation here)
  return { success: true, user: data.user }
}


// ==========================================
// Logout
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