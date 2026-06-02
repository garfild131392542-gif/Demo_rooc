'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function updateMyProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()
  
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  
  // ของเดิม
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0
  const p_def = parseInt(formData.get('p_def') as string) || 0
  const m_def = parseInt(formData.get('m_def') as string) || 0

  // 👇 สิ่งที่เพิ่มเข้ามาใหม่ 6 ค่า 👇
  const p_atk = parseInt(formData.get('p_atk') as string) || 0
  const m_atk = parseInt(formData.get('m_atk') as string) || 0
  const p_dmg = parseFloat(formData.get('p_dmg') as string) || 0
  const m_dmg = parseFloat(formData.get('m_dmg') as string) || 0
  const p_reduc = parseFloat(formData.get('p_reduc') as string) || 0
  const m_reduc = parseFloat(formData.get('m_reduc') as string) || 0
  
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ 
      display_name, job_name, 
      pvp_reduc, pvp_dmg, p_def, m_def,
      p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc, // <- อย่าลืมใส่ตัวแปรลงไปตรงนี้ด้วย
      updated_at: new Date().toISOString() 
    } as any)
    .eq('id', (session as any).user?.id ?? (session as any).id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}