'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { redirect } from 'next/navigation'

/**
 * Renews the subscription by extending trial_ends_at by 30 days (Simulated / Mock)
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
 * Verifies the PromptPay slip using SlipOK API and extends the subscription by 30 days
 */
export async function verifyAndRenewSubscriptionAction(slipUrl: string, expectedAmount: number = 259) {
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
    return { success: false, error: 'ไม่พบสังกัดกิลด์ของคุณ' }
  }

  const apiKey = process.env.SLIPOK_API_KEY
  const branchId = process.env.SLIPOK_BRANCH_ID

  let verificationResult: any = null
  let isMock = false

  if (!apiKey || !branchId) {
    console.warn('[Billing] SlipOK API keys not configured. Running in Mock Mode.')
    isMock = true
    verificationResult = {
      success: true,
      amount: expectedAmount,
      transRef: 'MOCK_REF_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      senderName: 'นายจำลอง การโอน',
      receiverName: 'เว็บบอร์ดกิลด์ ROOC',
      transDate: new Date().toISOString()
    }
  } else {
    try {
      const response = await fetch(`https://api.slipok.com/api/line/apikey/${branchId.trim()}`, {
        method: 'POST',
        headers: {
          'x-authorization': apiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: slipUrl,
          log: true,
          amount: expectedAmount
        })
      })

      const result = await response.json()
      if (!response.ok || !result.success || !result.data) {
        return { 
          success: false, 
          error: result.message || 'การตรวจสอบสลิปไม่ผ่านหรือรูปสลิปไม่ถูกต้อง' 
        }
      }

      const data = result.data
      verificationResult = {
        success: true,
        amount: data.amount,
        transRef: data.transRef,
        senderName: data.sender?.displayName || data.sender?.name || 'ไม่ระบุชื่อ',
        receiverName: data.receiver?.displayName || data.receiver?.name || 'ไม่ระบุชื่อ',
        transDate: data.transDate || new Date().toISOString(),
        rawPayload: result
      }
    } catch (err: any) {
      console.error('[Billing] SlipOK API Exception:', err)
      return { success: false, error: 'ระบบตรวจสอบสลิปขัดข้องชั่วคราว โปรดลองใหม่อีกครั้ง' }
    }
  }

  // Check duplicate transaction reference in DB
  const { data: existingPayment } = await supabaseAny
    .from('payments')
    .select('id')
    .eq('trans_ref', verificationResult.transRef)
    .maybeSingle()

  if (existingPayment) {
    return { success: false, error: 'สลิปนี้เคยใช้ยืนยันการชำระเงินไปแล้ว ไม่สามารถใช้ซ้ำได้' }
  }

  // Get current guild's expiry to extend from
  const { data: guild } = await supabaseAny
    .from('guilds')
    .select('trial_ends_at')
    .eq('id', profile.guild_id)
    .maybeSingle()

  if (!guild) {
    return { success: false, error: 'ไม่พบข้อมูลกิลด์ของคุณ' }
  }

  let currentEnd = new Date()
  if (guild.trial_ends_at) {
    const trialEnd = new Date(guild.trial_ends_at)
    if (trialEnd > currentEnd) {
      currentEnd = trialEnd
    }
  }

  // Extend by 30 days
  const newTrialEndsAt = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Write payment history
  const { error: insertError } = await supabaseAny
    .from('payments')
    .insert([{
      guild_id: profile.guild_id,
      user_id: current.user.id,
      amount: verificationResult.amount,
      slip_url: slipUrl,
      trans_ref: verificationResult.transRef,
      sender_name: verificationResult.senderName,
      receiver_name: verificationResult.receiverName,
      trans_date: verificationResult.transDate,
      status: 'success',
      raw_payload: verificationResult.rawPayload || { mock: true }
    }])

  if (insertError) {
    console.error('[Billing] Failed to record payment:', insertError.message)
    return { success: false, error: 'บันทึกประวัติการชำระเงินไม่สำเร็จ: ' + insertError.message }
  }

  // Update Guild trial_ends_at
  const { error: updateError } = await supabaseAny
    .from('guilds')
    .update({ trial_ends_at: newTrialEndsAt.toISOString() })
    .eq('id', profile.guild_id)

  if (updateError) {
    console.error('[Billing] Failed to update guild expiry:', updateError.message)
    return { success: false, error: 'อัปเดตวันหมดอายุของกิลด์ไม่สำเร็จ: ' + updateError.message }
  }

  return { 
    success: true, 
    message: `ต่ออายุการใช้งานสำเร็จ! บัญชีกิลด์ได้รับการขยายถึงวันที่ ${newTrialEndsAt.toLocaleDateString('th-TH')}`,
    isMock: isMock
  }
}

/**
 * Gets payment history for the current user's guild
 */
export async function getGuildPaymentHistory() {
  const current = await getSession()
  if (!current?.user?.id) {
    return []
  }

  const supabase = await createAdminClient()
  const supabaseAny = supabase as any

  const { data: profile } = await supabaseAny
    .from('profiles')
    .select('guild_id')
    .eq('id', current.user.id)
    .maybeSingle()

  if (!profile?.guild_id) {
    return []
  }

  const { data: payments, error } = await supabaseAny
    .from('payments')
    .select('id, amount, sender_name, trans_date, trans_ref, status, created_at')
    .eq('guild_id', profile.guild_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Billing] Error fetching payment history:', error)
    return []
  }

  return payments || []
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
