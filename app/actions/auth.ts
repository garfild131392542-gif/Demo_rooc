'use server'

import { cache } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * Get current user session with profile data
 * Returns null if no user is logged in
 */
export const getSession = cache(async () => {
  try {
    const supabase = await createClient()

    // 🌟 FIXED: ตรวจสอบตัวตนผ่านเซิร์ฟเวอร์โดยตรง
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Fetch user's profile data
    let { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // 🌟 [APPLICATION SELF-HEALING]: ระบบตรวจจับและซ่อมแซมข้อมูลอัตโนมัติ
    // หากพบว่า uid_game เป็น NULL, ค่าว่าง หรือคำว่า 'EMPTY' ระบบจะสกัด Username จาก Email มาซ่อมแซมลง DB ให้ทันที
    const userEmail = user.email || ''
    const extractedUsername = userEmail.includes('@')
      ? userEmail.split('@')[0].trim()
      : userEmail.trim()

    if (extractedUsername) {
      if (profile) {
        if (!profile.uid_game || profile.uid_game === '' || profile.uid_game === 'EMPTY') {
          profile.uid_game = extractedUsername
          // ทำการอัปเดตลงฐานข้อมูลแบบ Background ทันที
          try {
            const admin = await createAdminClient()
            await (admin as any)
              .from('profiles')
              .update({ uid_game: extractedUsername, updated_at: new Date().toISOString() })
              .eq('id', user.id)
          } catch (healErr) {
            console.error('[Self-Healing Error] Could not update profile uid_game:', healErr)
          }
        }
      } else {
        // กรณีเป็น User ที่ยังไม่มีแถว Profile ในตาราง ให้สร้างขึ้นมาให้อัตโนมัติ
        try {
          const admin = await createAdminClient()
          const { data: newProfile } = await (admin as any)
            .from('profiles')
            .insert([{
              id: user.id,
              uid_game: extractedUsername,
              display_name: extractedUsername,
              role: 'member',
              cp: 0, p_atk: 0, m_atk: 0, p_def: 0, m_def: 0,
              p_dmg: 0, m_dmg: 0, p_reduc: 0, m_reduc: 0,
              pvp_dmg: 0, pvp_reduc: 0, hp: 0, sp: 0,
              ignore_pdef: 0, ignore_mdef: 0, cri: 0, cri_dmg: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select('*')
            .maybeSingle()

          if (newProfile) {
            profile = newProfile
          }
        } catch (insertHealErr) {
          console.error('[Self-Healing Error] Could not create profile row:', insertHealErr)
        }
      }
    }

    return {
      user: user,
      profile: profile || null,
    }
  } catch (err) {
    return null
  }
})

/**
 * Login user with email and password
 * Uses Supabase Auth standard signInWithPassword method
 * * @param email - User's email address
 * @param password - User's password
 * @returns { success: boolean, error?: string }
 */
export async function loginAction(email: string, password: string) {
  try {
    // 🛡️ ป้องกัน Brute-force Login DoS (จำกัด 10 ครั้ง ใน 2 นาที ต่อ IP)
    try {
      const headersList = await headers()
      const clientIp = getClientIp(headersList)
      const rateLimit = checkRateLimit(`login:${clientIp}`, {
        limit: 10,
        windowMs: 2 * 60 * 1000,
      })

      if (!rateLimit.allowed) {
        return {
          success: false,
          error: `พยายามเข้าสู่ระบบมากเกินไป กรุณารอ ${rateLimit.retryAfterSeconds} วินาทีแล้วลองใหม่`,
        }
      }
    } catch (ipErr) {
      // Ignored if headers() is unavailable
    }

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
          cri: 0, cri_dmg: 0,
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

export async function forgotPasswordAction(data: { username: string, inviteCode: string, newPassword: string }) {
  // 🛡️ ป้องกัน Brute-force Reset Password DoS (จำกัด 5 ครั้ง ใน 5 นาที ต่อ IP)
  try {
    const headersList = await headers()
    const clientIp = getClientIp(headersList)
    const rateLimit = checkRateLimit(`forgot-password:${clientIp}`, {
      limit: 5,
      windowMs: 5 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil(rateLimit.retryAfterSeconds / 60)
      return {
        success: false,
        error: `คุณทำรายการเปลี่ยนรหัสผ่านถี่เกินไป กรุณารอ ${waitMinutes} นาทีแล้วลองใหม่อีกครั้ง`,
      }
    }
  } catch (ipErr) {
    // Ignored if headers() is unavailable
  }

  // 1. ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่
  if (!data.username || !data.inviteCode || !data.newPassword) {
    return { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }
  }

  if (data.newPassword.length < 6) {
    return { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }
  }

  try {
    // 🌟 2. สร้าง Supabase Client ด้วย Service Role Key (สิทธิ์ Admin)
    // จำเป็นต้องใช้สิทธิ์ Admin ถึงจะสามารถเปลี่ยนรหัสผ่านให้คนอื่นโดยไม่ต้องส่งอีเมลยืนยันได้
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. ค้นหา Profile จาก Username ที่ระบุ
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, guild_id')
      .eq('uid_game', data.username.trim())
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' }
    }

    if (!profile.guild_id) {
      return { success: false, error: 'ชื่อผู้ใช้งานนี้ยังไม่ได้สังกัดกิลด์ใดๆ' }
    }

    // 4. ค้นหากิลด์ และตรวจสอบรหัสเชิญ (Invite Code)
    const { data: guild, error: guildError } = await supabaseAdmin
      .from('guilds')
      .select('invite_code')
      .eq('id', profile.guild_id)
      .single()

    if (guildError || !guild) {
      return { success: false, error: 'ไม่พบข้อมูลกิลด์ของบัญชีนี้' }
    }

    // เทียบรหัสเชิญว่าตรงกันหรือไม่ (เช็ค Case Sensitive)
    if (guild.invite_code !== data.inviteCode.trim()) {
      return { success: false, error: 'รหัสเชิญกิลด์ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' }
    }

    // 🌟 5. ถ้าข้อมูลตรงทั้งหมด สั่งบังคับเปลี่ยนรหัสผ่านด้วย Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id, // auth_user_id (id จากตาราง profiles ตรงกับตาราง auth.users)
      { password: data.newPassword }
    )

    if (updateError) {
      return { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน: ' + updateError.message }
    }

    // สำเร็จ!
    return { 
      success: true, 
      message: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว' 
    }

  } catch (err: any) {
    console.error('Reset Password Error:', err)
    return {
      success: false,
      error: 'เกิดระบบขัดข้อง โปรดลองอีกครั้งในภายหลัง'
    }
  }
}