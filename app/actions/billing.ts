'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { redirect } from 'next/navigation'

/**
 * Renews the subscription by extending trial_ends_at by 30 days
 */
export async function renewSubscriptionAction() {
  const current = await getSession()
  if (!current?.user?.id) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  // Get user's profile to get their guild_id
  const { data: profile } = await supabaseAny
    .from('profiles')
    .select('guild_id')
    .eq('id', current.user.id)
    .maybeSingle()

  if (!profile?.guild_id) {
    return { success: false, error: 'ไม่พบกิลด์ของคุณ' }
  }

  // Calculate new trial end date: 30 days from now
  const newTrialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Update the guild's trial_ends_at
  const { error: updateError } = await supabaseAny
    .from('guilds')
    .update({ trial_ends_at: newTrialEndsAt.toISOString() })
    .eq('id', profile.guild_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Redirect back to dashboard after successful renewal
  redirect('/')
}

/**
 * Fetches the current guild's trial status
 */
export async function getGuildTrialStatus() {
  const current = await getSession()
  if (!current?.user?.id) {
    return null
  }

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  const { data: profile } = await supabaseAny
    .from('profiles')
    .select('guild_id')
    .eq('id', current.user.id)
    .maybeSingle()

  if (!profile?.guild_id) {
    return null
  }

  const { data: guild } = await supabaseAny
    .from('guilds')
    .select('trial_ends_at')
    .eq('id', profile.guild_id)
    .maybeSingle()

  if (!guild) {
    return null
  }

  return {
    trial_ends_at: guild.trial_ends_at,
    days_remaining: calculateDaysRemaining(guild.trial_ends_at),
    is_expired: isTrialExpired(guild.trial_ends_at),
  }
}

/**
 * Helper function to calculate days remaining
 */
function calculateDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0

  const endDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.max(0, daysRemaining)
}

/**
 * Helper function to check if trial is expired
 */
function isTrialExpired(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return true

  const endDate = new Date(trialEndsAt)
  const now = new Date()

  return now > endDate
}
