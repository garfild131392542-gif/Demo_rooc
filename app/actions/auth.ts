'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// กำหนด Type ให้ชัดเจนเพื่อป้องกันความสับสน
type SessionData = {
  id: string;
  uid_game: string;
  role: 'admin' | 'member';
  display_name: string; // เพิ่มตัวนี้เข้ามา
}

export async function loginAction(uid: string, password: string) {
  try {
    const supabase = await createClient()

    if (!password || password.trim() === '') {
      return { success: false, error: 'รหัสผ่านต้องไม่เป็นค่าว่าง' }
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('uid_game', uid)
      .single()

    if (error || !profile) {
      return { success: false, error: 'ไม่พบ UID นี้ในระบบ โปรดติดต่อ Admin' }
    }

    if (profile.password_game === null) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ password_game: password } as any)
        .eq('uid_game', uid)
        .select()
        .single()

      if (updateError || !updatedProfile) {
        return { success: false, error: 'เกิดข้อผิดพลาดในการตั้งรหัสผ่าน กรุณาติดต่อ Admin' }
      }
    } else {
      if (profile.password_game !== password) {
        return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' }
      }
    }

    // 💡 4. On success: เพิ่ม display_name ลงไปใน Session ทันที
    const sessionData: SessionData = {
      id: profile.id,
      uid_game: profile.uid_game,
      role: profile.role,
      display_name: profile.display_name || 'No Name', // ดึงจากฐานข้อมูลมาใส่
    }

    const cookieValue = Buffer.from(JSON.stringify(sessionData)).toString('base64')

    const cookieStore = await cookies()
    cookieStore.set('auth_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_session')
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('auth_session')

  if (!sessionCookie?.value) return null

  try {
    const jsonStr = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    // 💡 แค่ถอดรหัส JSON ออกมา ข้อมูล display_name ก็จะติดออกมาด้วยเลย ไม่ต้อง Query ซ้ำ
    return JSON.parse(jsonStr) as SessionData
  } catch (e) {
    return null
  }
}