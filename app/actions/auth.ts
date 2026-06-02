'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
// 💡 ดึงเอาประเภทข้อมูล (Types) ที่เราอุตส่าห์ทำไว้ใน Phase 2 มาสยบ TypeScript ครับ
import type { Profile, Admin } from '@/types/database'

// ==========================================
// 1. สมัครสมาชิก (Register) - Phase 3
// ==========================================
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
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ==========================================
// 4. ดึงข้อมูล Session
// ==========================================
export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) return null

  // ดึงข้อมูลโปรไฟล์ดิบ
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // 💡 บังคับให้ TypeScript รู้ว่านี่คือ Profile แน่นอน ไม่ใช่ never
  const profile = profileData as Profile | null

  // ดึงข้อมูลแอดมินดิบ
  const { data: adminData } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // 💡 บังคับให้ TypeScript รู้ว่านี่คือ Admin แน่นอน ไม่ใช่ never
  const admin = adminData as Admin | null

  return {
    id: user.id,
    email: user.email,
    role: profile?.role ?? 'member',
    guild_id: profile?.guild_id ?? null,
    display_name: profile?.display_name ?? 'สมาชิกใหม่',
    uid_game: profile?.uid_game ?? 'ยังไม่ได้ตั้งชื่อ',
    is_admin: Boolean(admin),
    admin_role: admin?.role ?? null,
  }
}