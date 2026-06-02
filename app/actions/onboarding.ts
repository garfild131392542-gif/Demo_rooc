 'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { redirect } from 'next/navigation'

const GUILD_URL_REGEX = /^[a-z0-9-]+$/

export async function createGuildOnboardingAction(
  guildName: string,
  serverName: string,
  guildUrl: string,
) {
  const current = await getSession()
  if (!current?.user?.id) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  const normalizedGuildName = (guildName || '').trim()
  const normalizedServerName = (serverName || '').trim()
  const normalizedGuildUrl = (guildUrl || '').trim()

  if (!normalizedGuildName) {
    return { success: false, error: 'กรุณากรอกชื่อกิลด์' }
  }
  if (!normalizedServerName) {
    return { success: false, error: 'กรุณากรอกชื่อเซิร์ฟเวอร์' }
  }
  if (!normalizedGuildUrl || !GUILD_URL_REGEX.test(normalizedGuildUrl)) {
    return {
      success: false,
      error: 'กรุณากรอก URL ที่ถูกต้อง (a-z, 0-9 และ - เท่านั้น)',
    }
  }

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // Duplicate check (must bypass RLS)
  const { data: existing } = await supabaseAny
    .from('guilds')
    .select('id')
    .eq('guild_url', normalizedGuildUrl)
    .maybeSingle()

  if (existing?.id) {
    return {
      success: false,
      error: 'URL นี้ถูกใช้งานไปแล้ว กรุณาใช้ชื่ออื่น',
    }
  }

  const { data: guild, error: guildError } = await supabaseAny
    .from('guilds')
    .insert([
      {
        owner_id: current.user.id,
        name: normalizedGuildName,
        server_name: normalizedServerName,
        guild_url: normalizedGuildUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .maybeSingle()

  if (guildError) {
    return { success: false, error: guildError.message }
  }
  if (!guild?.id) {
    return { success: false, error: 'ไม่สามารถสร้างกิลด์ได้' }
  }

  const { error: profileError } = await supabaseAny
    .from('profiles')
    .update({ guild_id: guild.id, role: 'admin' })
    .eq('id', current.user.id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  redirect('/')
}

