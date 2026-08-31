'use server'

import { Resend } from 'resend'
import { headers } from 'next/headers'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { validateEmail } from '@/lib/validations'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendContactEmail(formData: FormData) {
  const contactEmail = (formData.get('contactEmail') as string || '').trim()
  const message = (formData.get('message') as string || '').trim()

  // 🛡️ ป้องกัน DoS & SMTP Blacklist ด้วย Rate Limiting (สูงสุด 3 ครั้งใน 10 นาที ต่อ IP)
  try {
    const headersList = await headers()
    const clientIp = getClientIp(headersList)
    const rateLimit = checkRateLimit(`contact:${clientIp}`, {
      limit: 3,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil(rateLimit.retryAfterSeconds / 60)
      return {
        success: false,
        error: `คุณส่งข้อความติดต่อถี่เกินไป กรุณารออีก ${waitMinutes} นาทีแล้วลองใหม่ครับ`,
      }
    }
  } catch (rateLimitErr) {
    console.warn('[Contact RateLimit Warning]', rateLimitErr)
  }

  // 🛡️ ตรวจสอบความถูกต้องและจำกัดขนาดข้อมูล
  if (!contactEmail) {
    return { success: false, error: 'กรุณาระบุอีเมลสำหรับติดต่อกลับ' }
  }

  const emailValidation = validateEmail(contactEmail)
  if (!emailValidation.valid) {
    return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' }
  }

  if (!message) {
    return { success: false, error: 'กรุณากรอกรายละเอียดปัญหา' }
  }

  if (message.length > 2000) {
    return { success: false, error: 'รายละเอียดปัญหายาวเกินกำหนด (สูงสุด 2,000 ตัวอักษร)' }
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const toEmail = process.env.ADMIN_EMAIL || 'sakditach25@gmail.com'

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: contactEmail,
      subject: `🚨 แจ้งปัญหาจากผู้ใช้งานระบบ ROOC Guild`,
      text: `มีผู้ใช้งานแจ้งปัญหาเข้ามาครับ:\n\nอีเมลสำหรับติดต่อกลับ: ${contactEmail}\nรายละเอียดปัญหา:\n${message}`,
    })
    
    return { success: true }
  } catch (error: any) {
    console.error('Email error:', error)
    return { success: false, error: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่ภายหลัง' }
  }
}