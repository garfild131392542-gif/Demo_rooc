'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/auth'

export async function registerAction(formData: FormData) {
  try {
    const supabase = await createAdminClient()

    const uid = (formData.get('uid_game') as string || '').trim()
    const password = formData.get('password') as string
    const displayName = formData.get('display_name') as string
    const jobName = formData.get('job_name') as string

    if (!uid || !password) return { success: false, error: 'UID และรหัสผ่านต้องไม่ว่าง' }

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('uid_game', uid)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'UID นี้ถูกลงทะเบียนไว้แล้วในระบบ กรุณาติดต่อ Admin' }
    }

    const pwHash = hashPassword(password)

    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          uid_game: uid,
          password_game: pwHash,
          display_name: displayName,
          job_name: jobName,
          role: 'member',
          p_def: 0,
          m_def: 0,
          pvp_reduc: 0,
          pvp_dmg: 0,
          last_stat_update: new Date().toISOString()
        }
      ])

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }
  }
}