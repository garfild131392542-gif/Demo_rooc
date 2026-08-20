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

  // 1. Fetch all guilds
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
      contact_email,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (guildsError) {
    console.error('Error fetching manageable guilds:', guildsError.message)
    throw new Error('ไม่สามารถดึงข้อมูลกิลด์ได้: ' + guildsError.message)
  }

  // 2. Fetch all profiles in chunks of 1000 to overcome Supabase PostgREST 1000 row limit
  let allProfiles: any[] = []
  let from = 0
  const CHUNK_SIZE = 1000
  while (true) {
    const { data: chunk, error: chunkError } = await supabaseAny
      .from('profiles')
      .select('id, guild_id, display_name, role, uid_game')
      .range(from, from + CHUNK_SIZE - 1)

    if (chunkError) {
      console.error('Error fetching profiles chunk:', chunkError.message)
      break
    }

    if (!chunk || chunk.length === 0) break
    allProfiles = allProfiles.concat(chunk)
    if (chunk.length < CHUNK_SIZE) break
    from += CHUNK_SIZE
  }

  // 3. Fetch all guild owners to get their contact email in memory
  const { data: owners, error: ownersError } = await supabaseAny
    .from('guild_owners')
    .select('id, email')

  if (ownersError) {
    console.error('Error fetching guild owners:', ownersError.message)
  }

  const countsMap: Record<string, number> = {}
  const profilesMap: Record<string, any> = {}
  const guildAdminsMap: Record<string, any> = {}

  allProfiles.forEach((p: any) => {
    profilesMap[p.id] = p
    if (p.guild_id) {
      countsMap[p.guild_id] = (countsMap[p.guild_id] || 0) + 1
      if (p.role === 'admin' && !guildAdminsMap[p.guild_id]) {
        guildAdminsMap[p.guild_id] = p
      }
    }
  })

  const ownersMap: Record<string, any> = {}
  owners?.forEach((o: any) => {
    ownersMap[o.id] = o
  })

  // 4. Map member counts and format owner profile
  return (guilds || []).map((guild: any) => {
    const profile = profilesMap[guild.owner_id] || guildAdminsMap[guild.id]
    const ownerContact = ownersMap[guild.owner_id]
    
    return {
      id: guild.id,
      name: guild.name,
      server_name: guild.server_name,
      status: guild.status,
      plan_type: guild.plan_type,
      trial_ends_at: guild.trial_ends_at,
      created_at: guild.created_at,
      member_count: countsMap[guild.id] || 0,
      owner: {
        display_name: profile?.display_name || 'ไม่พบหัวหน้ากิลด์',
        email: ownerContact?.email || guild.contact_email || null
      }
    }
  })
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
/**
 * Fetches all announcements and lists the guild IDs they target.
 */
export async function getAllAnnouncementsForAdmin() {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  const { data: announcements, error: annError } = await supabaseAny
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (annError || !announcements) {
    console.error('Error fetching all announcements:', annError?.message)
    return []
  }

  // ดึงเป้าหมายกิลด์ของทุกประกาศ
  const { data: targets, error: targetsError } = await supabaseAny
    .from('announcement_guilds')
    .select('announcement_id, guild_id')

  if (targetsError) {
    console.error('Error fetching announcement targets:', targetsError.message)
  }

  const targetsMap: Record<string, string[]> = {}
  if (targets) {
    for (const t of targets) {
      if (!targetsMap[t.announcement_id]) {
        targetsMap[t.announcement_id] = []
      }
      targetsMap[t.announcement_id].push(t.guild_id)
    }
  }

  return announcements.map((ann: any) => ({
    id: ann.id,
    title: ann.title,
    subtitle: ann.subtitle,
    items: ann.items || [],
    footer: ann.footer,
    is_active: ann.is_active,
    created_at: ann.created_at,
    updated_at: ann.updated_at,
    targetGuildIds: targetsMap[ann.id] || []
  }))
}

/**
 * Fetches the latest announcement and lists the guild IDs it targets (Legacy helper).
 */
export async function getLatestAnnouncementForAdmin() {
  const all = await getAllAnnouncementsForAdmin()
  return all.length > 0 ? all[0] : null
}

/**
 * Saves or updates a specific announcement campaign and its target guilds.
 */
export async function saveAnnouncementCampaign(
  announcementData: {
    id?: string
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

  let announcementId = announcementData.id

  if (announcementId) {
    // อัปเดตประกาศเดิม
    const { error: updateError } = await supabaseAny
      .from('announcements')
      .update({
        title: announcementData.title,
        subtitle: announcementData.subtitle || null,
        items: announcementData.items,
        footer: announcementData.footer || null,
        is_active: announcementData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', announcementId)

    if (updateError) {
      console.error('Error updating announcement:', updateError.message)
      return { success: false, error: 'อัปเดตประกาศไม่สำเร็จ: ' + updateError.message }
    }

    // ลบกิลด์เป้าหมายเดิมออกก่อน
    await supabaseAny
      .from('announcement_guilds')
      .delete()
      .eq('announcement_id', announcementId)
  } else {
    // สร้างประกาศชุดใหม่
    const { data: newAnn, error: insertError } = await supabaseAny
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

    if (insertError) {
      console.error('Error inserting announcement:', insertError.message)
      return { success: false, error: 'สร้างประกาศไม่สำเร็จ: ' + insertError.message }
    }

    announcementId = newAnn.id
  }

  // บันทึกกิลด์เป้าหมายใหม่
  if (targetGuildIds.length > 0 && announcementId) {
    const targets = targetGuildIds.map((guildId) => ({
      announcement_id: announcementId,
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
  return { success: true, id: announcementId }
}

/**
 * Deletes an announcement campaign and its target links.
 */
export async function deleteAnnouncementCampaign(announcementId: string) {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // 1. ลบเป้าหมายกิลด์ที่ผูกกับประกาศนี้ออกก่อน
  try {
    await supabaseAny
      .from('announcement_guilds')
      .delete()
      .eq('announcement_id', announcementId)
  } catch (linkErr) {
    console.error('Error removing announcement_guilds links:', linkErr)
  }

  // 2. ลบตัวชุดประกาศออกจากตาราง announcements
  const { error } = await supabaseAny
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) {
    console.error('Error deleting announcement:', error.message)
    return { success: false, error: 'ลบประกาศไม่สำเร็จ: ' + error.message }
  }

  revalidatePath('/admin-control')
  revalidatePath('/')
  return { success: true }
}

/**
 * Toggle active status of an announcement campaign.
 */
export async function toggleAnnouncementCampaignStatus(announcementId: string, isActive: boolean) {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('announcements')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', announcementId)

  if (error) {
    console.error('Error toggling announcement status:', error.message)
    return { success: false, error: 'เปลี่ยนสถานะไม่สำเร็จ: ' + error.message }
  }

  revalidatePath('/admin-control')
  revalidatePath('/')
  return { success: true }
}

/**
 * Saves a new announcement and configures its target guilds (Legacy wrapper).
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
  return saveAnnouncementCampaign(announcementData, targetGuildIds)
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

/**
 * Fetches the global update ticker settings.
 * Accessible by anyone (public).
 */
export async function getUpdateTickerSetting() {
  const supabase = await createAdminClient()
  const { data, error } = await (supabase as any)
    .from('system_settings')
    .select('value')
    .eq('key', 'update_ticker')
    .maybeSingle()

  if (error || !data) {
    return {
      text: '📢 อัปเดตใหม่ล่าสุด: ปรับลดราคาแพ็กเกจเป็น 259 บาท/30 วัน | เปิดให้ใช้งานระบบจัดทีมปาร์ตี้ หน้าข้อมูลส่วนตัว และบอร์ดกิลด์ฟรี! (จำกัดสิทธิ์เฉพาะส่วนการประมูลหากยังไม่ได้ชำระเงิน)',
      is_visible: true
    }
  }

  return data.value as { text: string; is_visible: boolean }
}

/**
 * Saves the global update ticker settings.
 * Restricted to System Admins.
 */
export async function saveUpdateTickerSetting(data: { text: string; is_visible: boolean }) {
  await checkSystemAdmin()

  const supabase = await createAdminClient()
  const { error } = await (supabase as any)
    .from('system_settings')
    .upsert({
      key: 'update_ticker',
      value: data,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error saving update ticker settings:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin-control')
  return { success: true }
}
