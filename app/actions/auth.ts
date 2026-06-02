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
 * Also creates a profile record for the new user
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

  // Step 1: Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user?.id) {
    return { success: false, error: 'ไม่สามารถสร้างบัญชีได้' }
  }

  // Step 2: Create profile record using admin client (bypasses RLS)
  try {
    const adminClient = await createAdminClient()
    const adminAny = adminClient as any

    const { error: profileError } = await adminAny
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          uid_game: email.split('@')[0], // Use email prefix as game username
          display_name: email.split('@')[0],
          job_name: 'Beginner',
          role: 'member', // Default role
          p_atk: 0,
          m_atk: 0,
          p_def: 0,
          m_def: 0,
          p_dmg: 0,
          m_dmg: 0,
          p_reduc: 0,
          m_reduc: 0,
          pvp_dmg: 0,
          pvp_reduc: 0,
          created_at: new Date().toISOString(),
        },
      ])

    if (profileError) {
      console.error('Error creating profile:', profileError.message)
      // Don't fail - user account was created even if profile creation failed
    }
  } catch (err: any) {
    console.error('Error in profile creation:', err.message)
    // Don't fail - user account was created
  }

  return { success: true }
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