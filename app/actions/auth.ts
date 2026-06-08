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

    // 🌟 FIXED: เปลี่ยนมาใช้ getUser() ตรวจสอบตัวตนผ่านเซิร์ฟเวอร์โดยตรง เพื่อความปลอดภัยและลบตัวแจ้งเตือนสีเหลือง
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Fetch user's profile data
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return {
      user: user,
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
export async function registerAction(username: string, password: string) {
  if (!username || !password) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Username) และรหัสผ่านให้ครบถ้วน' }
  }

  const supabase = await createClient()

  // Apply virtual email trick: if no @ symbol, append @member.rooc
  const finalEmail = `${username.trim().toLowerCase()}@member.rooc`
  

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

  try {
    const adminClient = await createAdminClient()
    const { error: profileError } = await (adminClient as any)
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          uid_game: username.trim(), // 🎯 ล็อกค่า Username ลงคอลัมน์ uid_game ทันที ข้อมูลจะไม่หลุดชัวร์!
          role: 'member',           // เซ็ตยศเริ่มต้นเป็นลูกกิลด์ธรรมดา (จะถูกอัปเกรดเป็น admin เองถ้าเขาเลือกสร้างกิลด์)
          p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
          p_dmg: 0, m_dmg: 0, p_reduc: 0, m_reduc: 0,
          pvp_dmg: 0, pvp_reduc: 0,
          created_at: new Date().toISOString(),
        },
      ])

    if (profileError) {
      console.error('Initial profile creation warning:', profileError.message)
    }
  } catch (catchError) {
    console.error('Failed to run initial profile query:', catchError)
  }
  
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