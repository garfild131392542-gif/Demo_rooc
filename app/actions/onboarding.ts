 'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'

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

  // Calculate trial end date: 14 days from now
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  
  // Generate unique invite code (random 8 character string)
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data: guild, error: guildError } = await supabaseAny
    .from('guilds')
    .insert([
      {
        owner_id: current.user.id,
        name: normalizedGuildName,
        server_name: normalizedServerName,
        guild_url: normalizedGuildUrl,
        invite_code: inviteCode,
        status: 'pending', // ✅ Insert as pending (constraint allows this)
        trial_ends_at: trialEndsAt.toISOString(),
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

  // Auto-approve: Update status to 'approved' immediately after creation
  try {
    const { data: updatedGuild, error: approveError } = await supabaseAny
      .from('guilds')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', guild.id)
      .select()
      .maybeSingle()

    if (approveError) {
      console.error('❌ Error auto-approving guild:', {
        message: approveError.message,
        guildId: guild.id,
      })
    } else {
      console.log('✅ Guild auto-approved:', updatedGuild?.id, updatedGuild?.status)
    }
  } catch (err: any) {
    console.error('❌ Exception in auto-approve:', err)
  }

  const { error: profileError } = await supabaseAny
    .from('profiles')
    .update({ guild_id: guild.id, role: 'admin' })
    .eq('id', current.user.id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  return { success: true, guildId: guild.id }
}

