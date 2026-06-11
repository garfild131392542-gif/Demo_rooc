'use server'

import { registerAction as registerAuthAction } from './auth'
import {
  
  validatePassword,
  validatePasswordMatch,
} from '@/lib/validations'

interface RegisterFormData {
  username: string // 🌟 ใช้ Username ตามแผนของเรา
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
    // 🌟 1. ปรับการตรวจสอบ: ตรวจสอบ Username แทนอีเมล
    if (!formData.username || !formData.username.trim()) {
      return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Username)' }
    }
    
    if (formData.username.includes('@')) {
      return { success: false, error: 'ชื่อผู้ใช้งานต้องไม่มีเครื่องหมาย @' }
    }

    // 2. ตรวจสอบข้อมูลเบอร์โทรศัพท์และรหัสผ่านตามปกติ
    

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error }
    }

    const passwordMatchValidation = validatePasswordMatch(formData.password, formData.confirmPassword)
    if (!passwordMatchValidation.valid) {
      return { success: false, error: passwordMatchValidation.error }
    }

    // Note: firstName, lastName, and phone จะถูกบันทึกผ่านหน้า /profile-setup 
    // หรือระบุตอนบันทึกข้อมูลกิลด์ในด่านถัดไปตามความเหมาะสม

    // 🌟 3. ส่งข้อมูล Username (แทนอีเมลเดิม) ไปให้ auth.ts แปลงเป็น Virtual Email
    const result = await registerAuthAction(formData.username, formData.password)

    if (!result.success) {
      return { success: false, error: result.error || 'ไม่สามารถสร้างบัญชีผู้ใช้งานได้' }
    }

    return {
      success: true,
      userId: (result as any).user?.id || (result as any).userId,
    }
  } catch (error) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด โปรดลองอีกครั้ง'
    return {
      success: false,
      error: errorMessage,
    }
  }
}