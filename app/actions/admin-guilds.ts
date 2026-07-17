'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

/**
 * Helper function to verify that the current user has System Admin privileges.
 * Throws an error if unauthorized.
 */
async function checkSystemAdmin() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('กรุณาเข้าสู่ระบบก่อน')
  }

  const supabase = await createClient()
  const { data: adminCheck, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error || !adminCheck) {
    throw new Error('ไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะผู้ดูแลระบบ)')
  }
}

/**
 * Fetches all guilds in the system along with their member counts,
 * plan type, trial expiry date, and owner profile.
 */
export async function getManageableGuilds() {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // 1. Fetch all guilds and their owner profiles
  const { data: guilds, error: guildsError } = await supabaseAny
    .from('guilds')
    .select(`
      id,
      name,
      server_name,
      status,
      plan_type,
      trial_ends_at,
      owner_id,
      created_at,
      profiles!owner_id (
        display_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (guildsError) {
    console.error('Error fetching manageable guilds:', guildsError.message)
    throw new Error('ไม่สามารถดึงข้อมูลกิลด์ได้: ' + guildsError.message)
  }

  // 2. Fetch all profiles to calculate member count for each guild in memory
  const { data: profiles, error: profilesError } = await supabaseAny
    .from('profiles')
    .select('guild_id')

  if (profilesError) {
    console.error('Error fetching profiles for counts:', profilesError.message)
    throw new Error('ไม่สามารถคำนวณจำนวนสมาชิกกิลด์ได้')
  }

  const countsMap: Record<string, number> = {}
  profiles?.forEach((p: any) => {
    if (p.guild_id) {
      countsMap[p.guild_id] = (countsMap[p.guild_id] || 0) + 1
    }
  })

  // 3. Map member counts and format owner profile
  return (guilds || []).map((guild: any) => ({
    id: guild.id,
    name: guild.name,
    server_name: guild.server_name,
    status: guild.status,
    plan_type: guild.plan_type,
    trial_ends_at: guild.trial_ends_at,
    created_at: guild.created_at,
    member_count: countsMap[guild.id] || 0,
    owner: Array.isArray(guild.profiles) ? guild.profiles[0] : guild.profiles
  }))
}

/**
 * Updates a guild's plan type (free/pro) and subscription expiry date.
 */
export async function updateGuildPlanAndExpiry(
  guildId: string,
  data: { plan_type: string; trial_ends_at: string | null }
) {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const { error } = await (supabase as any)
    .from('guilds')
    .update({
      plan_type: data.plan_type,
      trial_ends_at: data.trial_ends_at
    })
    .eq('id', guildId)

  if (error) {
    console.error('Error updating guild settings:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin-control')
  revalidatePath('/')
  return { success: true }
}

/**
 * Fetches the latest announcement and lists the guild IDs it targets.
 */
export async function getLatestAnnouncementForAdmin() {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  const { data: announcement, error: annError } = await supabaseAny
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (annError) {
    console.error('Error fetching latest announcement:', annError.message)
    return null
  }

  if (!announcement) {
    return null
  }

  const { data: targets, error: targetsError } = await supabaseAny
    .from('announcement_guilds')
    .select('guild_id')
    .eq('announcement_id', announcement.id)

  if (targetsError) {
    console.error('Error fetching announcement targets:', targetsError.message)
  }

  return {
    ...announcement,
    targetGuildIds: targets?.map((t: any) => t.guild_id) || []
  }
}

/**
 * Saves a new announcement and configures its target guilds.
 * Every save creates a new announcement ID to reset the "seen" status.
 */
export async function saveAnnouncementWithTargets(
  announcementData: {
    title: string
    subtitle?: string
    items: any[]
    footer?: string
    is_active: boolean
  },
  targetGuildIds: string[]
) {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // 1. Insert new announcement
  const { data: newAnn, error: annError } = await supabaseAny
    .from('announcements')
    .insert([{
      title: announcementData.title,
      subtitle: announcementData.subtitle || null,
      items: announcementData.items,
      footer: announcementData.footer || null,
      is_active: announcementData.is_active
    }])
    .select('id')
    .single()

  if (annError) {
    console.error('Error saving announcement:', annError.message)
    return { success: false, error: 'บันทึกประกาศไม่สำเร็จ: ' + annError.message }
  }

  // 2. Insert target guilds if there are any
  if (targetGuildIds.length > 0) {
    const targets = targetGuildIds.map((guildId) => ({
      announcement_id: newAnn.id,
      guild_id: guildId
    }))

    const { error: targetsError } = await supabaseAny
      .from('announcement_guilds')
      .insert(targets)

    if (targetsError) {
      console.error('Error saving announcement targets:', targetsError.message)
      return { success: false, error: 'บันทึกเป้าหมายประกาศไม่สำเร็จ: ' + targetsError.message }
    }
  }

  revalidatePath('/admin-control')
  revalidatePath('/')
  return { success: true }
}

/**
 * Fetches the active announcement targeting the logged-in user's guild.
 * Public method called by components/layout on the client or server.
 */
export async function getActiveAnnouncementForGuild(guildId: string) {
  if (!guildId) return null

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // 1. Fetch targeted announcements for this guild
  const { data: links, error: linksError } = await supabaseAny
    .from('announcement_guilds')
    .select('announcement_id')
    .eq('guild_id', guildId)

  if (linksError || !links || links.length === 0) {
    return null
  }

  const activeAnnIds = links.map((l: any) => l.announcement_id)

  // 2. Query the latest active announcement from those IDs
  const { data: announcement, error: annError } = await supabaseAny
    .from('announcements')
    .select('*')
    .in('id', activeAnnIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (annError || !announcement) {
    return null
  }

  return {
    id: announcement.id,
    title: announcement.title,
    subtitle: announcement.subtitle,
    items: announcement.items,
    footer: announcement.footer,
    is_active: announcement.is_active
  }
}
