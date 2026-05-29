'use server'

import { createAdminClient } from '@/lib/supabase/server' // ดึงมาจากไฟล์ที่มีอยู่แล้ว

export async function registerAction(formData: FormData) {
  try {
    const supabase = await createAdminClient()

    const uid = formData.get('uid_game') as string
    const password = formData.get('password') as string
    const displayName = formData.get('display_name') as string
    const jobName = formData.get('job_name') as string

    // 1. เช็คก่อนว่า UID นี้มีคนใช้สมัครไปหรือยัง
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('uid_game', uid.trim())
      .single()

    if (existingUser) {
      return { success: false, error: 'UID นี้ถูกลงทะเบียนไว้แล้วในระบบ กรุณาติดต่อ Admin' }
    }

    // 2. ถ้ายังไม่มี ให้ Insert ข้อมูลใหม่ลงไปเลย
    const { error } = await supabase
      .from('profiles')
      .insert([{
        uid_game: uid.trim(),
        password_game: password,
        display_name: displayName,
        job_name: jobName,
        role: 'member',
        p_def: 0,
        m_def: 0,
        pvp_reduc: 0,
        pvp_dmg: 0,
        last_stat_update: new Date().toISOString()
      }])

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }
  }
}