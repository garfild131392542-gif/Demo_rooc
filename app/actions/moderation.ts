'use server'

import { validateAndModerateImage, MAX_IMAGE_SIZE_BYTES } from '@/lib/image-moderation'
import { getSession } from './auth'

/**
 * Server Action for client components to check image safety before uploading
 */
export async function checkImageSafetyAction(formData: FormData): Promise<{ allowed: boolean; error?: string }> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { allowed: false, error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ' }
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return { allowed: false, error: 'ไม่พบไฟล์รูปภาพ' }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const moderation = await validateAndModerateImage(
      buffer,
      file.type,
      file.size,
      MAX_IMAGE_SIZE_BYTES
    )

    if (!moderation.allowed) {
      return { allowed: false, error: moderation.reason || 'รูปภาพไม่ผ่านการตรวจสอบความปลอดภัย' }
    }

    return { allowed: true }
  } catch (err: any) {
    console.error('[checkImageSafetyAction Error]', err)
    return { allowed: false, error: err.message || 'เกิดข้อผิดพลาดในการตรวจสอบรูปภาพ' }
  }
}
