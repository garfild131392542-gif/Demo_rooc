'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { hashPassword, verifyPassword, signSession, setSessionCookie, clearSessionCookie, getSessionPayloadFromCookie } from '@/lib/auth'

export async function registerUser(formData: FormData) {
  const supabase = await createClient()

  const uid = (formData.get('uid_game') as string || '').trim()
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string || ''
  const jobName = (formData.get('job_name') as string || '').trim()

  if (!uid || !password || !jobName) return { success: false, error: 'UID, รหัสผ่าน และอาชีพต้องไม่ว่าง' }

  // ตรวจสอบ UID ซ้ำ
  const { data: existing, error: exErr } = await supabase.from('profiles').select('id').eq('uid_game', uid).maybeSingle()
  if (exErr) return { success: false, error: exErr.message }
  if (existing) return { success: false, error: 'UID นี้ถูกใช้งานแล้ว' }

  const pwHash = hashPassword(password)

  const { error } = await supabase.from('profiles').insert([{
    uid_game: uid,
    password_game: pwHash,
    display_name: displayName,
    job_name: jobName,
    role: 'member',
    guild_id: null,
    created_at: new Date().toISOString(),
  }])

  if (error) return { success: false, error: error.message }

  redirect('/login')
}

export async function getSession() {
  // read our signed cookie and resolve profile
  const payload = await getSessionPayloadFromCookie()
  if (!payload || !payload.id) return null

  const supabase = await createClient()
  const [{ data: profile, error: pErr }, { data: admin, error: aErr }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', payload.id).maybeSingle(),
    supabase.from('admins').select('role').eq('id', payload.id).maybeSingle(),
  ])

  if (pErr) return null

  return {
    id: profile.id,
    email: profile.email ?? null,
    role: profile.role ?? 'member',
    guild_id: profile.guild_id ?? null,
    display_name: profile.display_name ?? 'Member',
    uid_game: profile.uid_game ?? '',
    is_admin: Boolean(admin),
    admin_role: admin?.role ?? null,
  }
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect('/login')
}

export async function loginAction(username: string, password: string) {
  const supabase = await createClient()
  const uid = username.trim()
  if (!uid || !password) return { success: false, error: 'UID หรือรหัสผ่านไม่ถูกต้อง' }

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('uid_game', uid).maybeSingle()
  if (error || !profile) return { success: false, error: 'ไม่พบ UID ในระบบ' }

  // ถ้า password_game เป็น null ให้ถือว่าเป็นการตั้งรหัสครั้งแรก
  if (profile.password_game === null) {
    const hashed = hashPassword(password)
    const { data: updated, error: upErr } = await supabase.from('profiles').update({ password_game: hashed }).eq('uid_game', uid).select().maybeSingle()
    if (upErr) return { success: false, error: upErr.message }
  } else {
    const ok = verifyPassword(profile.password_game, password)
    if (!ok) return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' }
  }

  // สร้าง session token และเซ็ต cookie
  const token = signSession({ id: profile.id, uid_game: profile.uid_game, display_name: profile.display_name, role: profile.role })
  await setSessionCookie(token)

  return { success: true }
}