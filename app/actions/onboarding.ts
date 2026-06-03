'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { validateGuildUrl } from '@/lib/validations'

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
        status: 'pending',
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

// NEW: Validate guild URL availability in real-time
export async function validateGuildUrlAction(
  guildUrl: string
): Promise<{ available: boolean; error?: string }> {
  try {
    // Client-side validation first
    const validation = validateGuildUrl(guildUrl)
    if (!validation.valid) {
      return { available: false, error: validation.error }
    }

    // Query database to check availability
    const supabase = createClient()
    const { data, error } = await supabase
      .from('guilds')
      .select('id')
      .eq('guild_url', guildUrl)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is what we want)
      console.error('Guild URL validation error:', error)
      return { available: false, error: 'Database query failed' }
    }

    // If data exists, URL is taken. If no data, URL is available
    const available = !data
    return { available }
  } catch (error) {
    console.error('Validation error:', error)
    return { available: false, error: 'An error occurred during validation' }
  }
}

// NEW: Complete onboarding and save data
interface OnboardingFormData {
  guildName: string
  guildUrl: string
  guildDescription: string
  discordLink?: string
  facebookLink?: string
}

export async function completeOnboardingAction(
  formData: OnboardingFormData
): Promise<{ success: boolean; error?: string; inviteLink?: string }> {
  try {
    // Validate guild URL one more time
    const urlValidation = await validateGuildUrlAction(formData.guildUrl)
    if (!urlValidation.available) {
      return { success: false, error: 'This guild URL is no longer available' }
    }

    const supabase = createClient()

    // Get current user
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return { success: false, error: 'User session not found' }
    }

    const userId = authData.user.id

    // Get current guild
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('guild_id')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: 'Profile not found' }
    }

    const guildId = profileData.guild_id

    // Update guild with onboarding data
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('guilds')
      .update({
        name: formData.guildName,
        guild_url: formData.guildUrl,
        server_name: formData.guildDescription,
        status: 'active',
      })
      .eq('id', guildId)

    if (updateError) {
      console.error('Guild update error:', updateError)
      return { success: false, error: 'Failed to update guild' }
    }

    // Generate invite link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteLink = `${appUrl}/g/${formData.guildUrl}`

    return {
      success: true,
      inviteLink,
    }
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

