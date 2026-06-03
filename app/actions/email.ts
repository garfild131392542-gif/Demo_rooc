'use server'

interface SendWelcomeEmailParams {
  email: string
  displayName?: string
  guildName: string
  guildUrl?: string
}

interface SendWelcomeEmailResponse {
  success: boolean
  error?: string
  messageId?: string
}

/**
 * Generate HTML email template for welcome email
 */
function generateWelcomeEmailHTML(
  displayName: string,
  guildName: string,
  guildUrl: string | undefined,
  loginUrl: string,
  inviteLink: string | undefined
): string {
  const hasInviteLink = guildUrl && inviteLink

  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ยินดีต้อนรับสู่ระบบกิลด์</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 ยินดีต้อนรับ!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Guild Management System</p>
        </div>

        <!-- Content -->
        <div style="background: #f9fafb; padding: 40px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0; font-size: 16px;">สวัสดี ${displayName || 'Guild Admin'},</p>
          
          <p style="font-size: 15px; line-height: 1.8; margin: 20px 0;">
            ยินดีต้อนรับสู่ <strong>${guildName}</strong> ✨
          </p>

          <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #667eea;">สิ่งที่คุณควรรู้</h2>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
              <li style="margin-bottom: 8px;">✅ ทดลองใช้งานฟรี <strong>14 วัน</strong> ยังไม่หมดอายุ</li>
              <li style="margin-bottom: 8px;">✅ เต็มที่สิทธิ์ในการจัดการสมาชิก</li>
              <li style="margin-bottom: 8px;">✅ ลิงก์เชิญพร้อมใช้งาน</li>
            </ul>
          </div>

          <!-- Login CTA -->
          <div style="margin: 30px 0; text-align: center;">
            <p style="margin-bottom: 15px; font-size: 14px; color: #666;">เข้าสู่ระบบเพื่อเริ่มจัดการกิลด์ของคุณ</p>
            <a href="${loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; transition: background 0.3s;">
              เข้าสู่ระบบ
            </a>
          </div>

          ${
            hasInviteLink
              ? `
          <!-- Invite Link Section -->
          <div style="background: #f0f9ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 6px; margin: 30px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af;">🔗 ลิงก์เชิญสมาชิก</h3>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">แชร์ลิงก์นี้เพื่อเชิญสมาชิกใหม่ให้เข้าร่วมกิลด์ของคุณ:</p>
            <div style="background: white; border: 1px dashed #94a3b8; padding: 12px; border-radius: 4px; margin-bottom: 12px; word-break: break-all;">
              <code style="font-family: 'Monaco', 'Courier New', monospace; font-size: 12px; color: #334155;">
                ${inviteLink}
              </code>
            </div>
            <p style="margin: 0; font-size: 12px; color: #64748b;">⚡ ลิงก์นี้พร้อมใช้งานแล้ว ใครก็สามารถเข้าร่วมได้ทันที</p>
          </div>
          `
              : `
          <!-- Setup Instructions -->
          <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 6px; margin: 30px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #92400e;">📋 ขั้นตอนต่อไป</h3>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #78350f;">หลังจากเข้าสู่ระบบ ให้ทำการ:</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350f;">
              <li style="margin-bottom: 6px;">ตั้งค่ากิลด์ของคุณ (ชื่อ, รายละเอียด, URL ที่ปรับแต่งได้)</li>
              <li style="margin-bottom: 6px;">ทำการสร้างลิงก์เชิญ</li>
              <li>เชิญสมาชิกให้เข้าร่วมกิลด์</li>
            </ol>
          </div>
          `
          }

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 5px 0;">หากมีคำถาม สามารถติดต่อเราได้ที่</p>
            <p style="margin: 5px 0; color: #667eea;">support@guildmanagement.com</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim()
}

/**
 * Send welcome email after successful registration
 * Falls back to console.log if RESEND_API_KEY is not available
 */
export async function sendWelcomeEmailAction(
  params: SendWelcomeEmailParams
): Promise<SendWelcomeEmailResponse> {
  try {
    const { email, displayName = 'Admin', guildName, guildUrl } = params
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const loginUrl = `${appUrl}/login`
    const inviteLink = guildUrl ? `${appUrl}/g/${guildUrl}` : undefined

    const subject = `🎉 ยินดีต้อนรับสู่ระบบกิลด์ - ${guildName}`
    const html = generateWelcomeEmailHTML(displayName, guildName, guildUrl, loginUrl, inviteLink)

    // Check if RESEND_API_KEY is available
    if (!process.env.RESEND_API_KEY) {
      // Fallback: Mock email sending with console.log (for local development)
      console.log('\n' + '='.repeat(80))
      console.log('[EMAIL MOCK - LOCAL DEVELOPMENT]')
      console.log('='.repeat(80))
      console.log(`To: ${email}`)
      console.log(`Subject: ${subject}`)
      console.log('='.repeat(80))
      console.log(html)
      console.log('='.repeat(80) + '\n')

      return {
        success: true,
        messageId: 'mock-' + Date.now(),
      }
    }

    // Use Resend SDK to send email
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const response = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject,
        html,
      })

      if (response.error) {
        console.error('[EMAIL ERROR]', response.error)
        return {
          success: false,
          error: 'Failed to send welcome email',
        }
      }

      return {
        success: true,
        messageId: response.data?.id,
      }
    } catch (importError) {
      console.error('[EMAIL SDK ERROR]', importError)
      return {
        success: false,
        error: 'Email service not configured',
      }
    }
  } catch (error) {
    console.error('[WELCOME EMAIL ERROR]', error)
    return {
      success: false,
      error: 'An unexpected error occurred while sending email',
    }
  }
}
