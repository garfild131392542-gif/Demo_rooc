'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'

// ฟังก์ชันสร้างกิลด์ใหม่ (สถานะ pending)
export async function createNewGuild(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'กรุณาล็อกอินก่อนสร้างกิลด์' }

  const supabase = await createAdminClient() // ใช้ admin client เพื่อ bypass RLS และเขียนข้อมูลโดยปลอดภัยจากเซิร์ฟเวอร์

  const guildName = formData.get('guildName') as string
  const serverName = formData.get('serverName') as string

  const inviteCode = 'ROOC-' + Math.random().toString(36).substring(2, 6).toUpperCase()

  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert([
      {
        name: guildName,
        server_name: serverName,
        owner_id: session.id,
        invite_code: inviteCode,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    ])
    .select()
    .maybeSingle()

  if (guildError) return { success: false, error: guildError.message }

  return { success: true, guildId: guild?.id ?? null, inviteCode }
}