'use server'

import { registerAction as registerAuthAction } from './auth'
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

    // Note: firstName, lastName, and phone are NOT used in auth step.
    // They will be stored in guild_owners table by a separate admin action if needed.
    // For now, we only handle authentication signup.

    // Call auth.ts registerAction (handles signUp + virtual email trick)
    const result = await registerAuthAction(formData.email, formData.password)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to create account' }
    }

    return {
      success: true,
      userId: result.user?.id,
    }
  } catch (error) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}