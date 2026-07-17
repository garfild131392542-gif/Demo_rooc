/**
 * Validation utilities for registration and onboarding forms
 */

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = (username || '').trim()
  if (!trimmed) {
    return { valid: false, error: 'กรุณากรอกชื่อผู้ใช้งาน' }
  }
  if (trimmed.includes('@')) {
    return { valid: false, error: 'ชื่อผู้ใช้งานห้ามมีเครื่องหมาย @' }
  }
  // Allow only alphanumeric, underscores, hyphens, and dots. No spaces or Thai characters.
  const usernameRegex = /^[a-zA-Z0-9_.-]+$/
  if (!usernameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'ชื่อผู้ใช้งานต้องเป็นภาษาอังกฤษ ตัวเลข จุด (.) ขีดกลาง (-) หรือขีดล่าง (_) เท่านั้น ห้ามใส่ภาษาไทยหรือช่องว่าง'
    }
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'ชื่อผู้ใช้งานต้องมีความยาวอย่างน้อย 3 ตัวอักษร' }
  }
  return { valid: true }
}


export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' }
  }
  return { valid: true }
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  const phoneRegex = /^\d{10}$/
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Phone number must be exactly 10 digits' }
  }
  return { valid: true }
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}

export function validateGuildUrl(url: string): { valid: boolean; error?: string } {
  if (url.length < 3) {
    return { valid: false, error: 'Guild URL must be at least 3 characters' }
  }
  const guildUrlRegex = /^[a-z0-9-]+$/
  if (!guildUrlRegex.test(url)) {
    return { valid: false, error: 'Guild URL can only contain lowercase letters, numbers, and hyphens' }
  }
  return { valid: true }
}

export function validateFirstName(name: string): { valid: boolean; error?: string } {
  if (name.trim().length === 0) {
    return { valid: false, error: 'First name is required' }
  }
  return { valid: true }
}

export function validateLastName(name: string): { valid: boolean; error?: string } {
  if (name.trim().length === 0) {
    return { valid: false, error: 'Last name is required' }
  }
  return { valid: true }
}
