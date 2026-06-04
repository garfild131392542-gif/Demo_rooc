'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'

// ฟังก์ชันสร้างกิลด์ใหม่ (สถานะ pending)
export async function createNewGuild(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'กรุณาล็อกอินก่อนสร้างกิลด์' }

  // เปลี่ยนชื่อตัวแปรเป็น adminClient ให้สื่อความหมายและตรงกับไฟล์อื่นๆ
  const adminClient = await createAdminClient() 

  const guildName = formData.get('guildName') as string
  const serverName = formData.get('serverName') as string

  const inviteCode = 'ROOC-' + Math.random().toString(36).substring(2, 6).toUpperCase()

  // 1. สร้างกิลด์ลงฐานข้อมูล
  const { data: guild, error: guildError } = await (adminClient as any)
    .from('guilds')
    .insert([
      {
        name: guildName,
        server_name: serverName,
        owner_id: session.user.id,
        invite_code: inviteCode,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    ])
    .select('id') // เลือกแค่ id เพื่อเอาไปผูกกับ Profile ต่อ
    .single()

  if (guildError || !guild) {
    return { success: false, error: guildError?.message || 'ไม่สามารถสร้างกิลด์ได้' }
  }

  // 🌟🌟🌟 2. [REFACTORED] เชื่อมโยง Profile เข้ากับ Guild ที่เพิ่งสร้างทันที 🌟🌟🌟
  const { error: profileUpdateError } = await (adminClient as any)
    .from('profiles')
    .update({
      guild_id: guild.id,
      role: 'admin' // เลื่อนยศให้เป็น admin อัตโนมัติ
    })
    .eq('id', session.user.id)

  if (profileUpdateError) {
    console.error('Error linking profile after guild creation:', profileUpdateError)
    // เราไม่ return error กลับไปให้ระบบพังเพราะกิลด์ถูกสร้างสำเร็จแล้ว แต่ log แจ้งเตือนไว้
  }
  // 🌟🌟🌟===========================================================🌟🌟🌟

  return { success: true, guildId: guild.id, inviteCode }
}