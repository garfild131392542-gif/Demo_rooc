'use server'

import nodemailer from 'nodemailer'

export async function sendContactEmail(formData: FormData) {
  const contactEmail = formData.get('contactEmail') as string
  const message = formData.get('message') as string

  try {
    // 💡 ตั้งค่า Nodemailer (คุณต้องเอาอีเมลและ App Password ของคุณมาใส่)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.ADMIN_EMAIL, // อีเมล Gmail ของคุณ
        pass: process.env.ADMIN_APP_PASSWORD, // รหัสผ่านแอปพลิเคชัน (App Password)
      },
    })

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL, // ส่งเข้าเมลตัวเอง
      subject: `🚨 แจ้งปัญหาจากผู้ใช้งานระบบ ROOC Guild`,
      text: `มีผู้ใช้งานแจ้งปัญหาเข้ามาครับ:\n\nอีเมลสำหรับติดต่อกลับ: ${contactEmail}\nรายละเอียดปัญหา:\n${message}`,
    }

    await transporter.sendMail(mailOptions)
    
    return { success: true }
  } catch (error: any) {
    console.error('Email error:', error)
    return { success: false, error: 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่ภายหลัง' }
  }
}