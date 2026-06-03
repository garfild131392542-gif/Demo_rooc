'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  validateEmail,
  validatePhoneNumber,
  validatePassword,
  validatePasswordMatch,
} from '@/lib/validations'

interface RegisterFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

interface RegisterResponse {
  success: boolean
  error?: string
  userId?: string
  guildId?: string
}

export async function registerAction(formData: RegisterFormData): Promise<RegisterResponse> {
  try {
    // Validate input
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error }
    }

    const phoneValidation = validatePhoneNumber(formData.phone)
    if (!phoneValidation.valid) {
      return { success: false, error: phoneValidation.error }
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error }
    }

    const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword)
    if (!passwordMatchValidation.valid) {
      return { success: false, error: passwordMatchValidation.error }
    }

    // Create auth user
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create account' }
    }

    const userId = authData.user.id

    // Create profile record
    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: userId,
        email: formData.email,
        display_name: `${formData.firstName} ${formData.lastName}`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone,
        role: 'admin',
      },
    ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return { success: false, error: 'Failed to create profile' }
    }

    // Create guild with 14-day trial
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    const adminClient = createAdminClient()
    const { data: guildData, error: guildError } = await adminClient
      .from('guilds')
      .insert([
        {
          name: `${formData.firstName}'s Guild`,
          owner_id: userId,
          trial_ends_at: trialEndsAt.toISOString(),
          status: 'pending',
        },
      ])
      .select('id, name')
      .single()

    if (guildError || !guildData) {
      console.error('Guild creation error:', guildError)
      return { success: false, error: 'Failed to create guild' }
    }

    const guildId = guildData.id

    // Update profile with guild_id
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ guild_id: guildId })
      .eq('id', userId)

    if (updateProfileError) {
      console.error('Profile update error:', updateProfileError)
      return { success: false, error: 'Failed to link profile to guild' }
    }

    // Mock welcome email sending
    console.log(`[EMAIL MOCK] Welcome email for: ${formData.email}`)
    console.log(`[EMAIL MOCK] Guild ID: ${guildId}, Guild Name: ${guildData.name}`)
    console.log(`[EMAIL MOCK] User ID: ${userId}`)

    return {
      success: true,
      userId,
      guildId,
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}