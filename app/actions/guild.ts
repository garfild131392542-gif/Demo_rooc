'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateGuildData {
  name: string
  description: string
  discordLink: string
  logoUrl?: string
  primaryColor?: string
  discordWebhookUrl?: string
  hallOfFameGoldUid?: string | null
  hallOfFameSilverUid?: string | null
  hallOfFameBronzeUid?: string | null
}

/**
 * 🌟 ฟังก์ชันอัปเดตข้อมูลกิลด์ (เฉพาะผู้ใช้ที่มี Role เป็น Admin เท่านั้น)
 */
export async function updateGuildAction(guildId: string, data: UpdateGuildData) {
  try {
    const supabase = await createClient()

    // 1. ตรวจสอบสถานะเซสชันการล็อกอินของผู้ใช้ปัจจุบัน
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      return { success: false, error: 'เซสชันหมดอายุหรือสิทธิ์การใช้งานไม่ถูกต้อง กรุณาล็อกอินใหม่' }
    }

    const userId = authData.user.id

    // 2. 🔒 ตรวจสอบความปลอดภัยด่านที่สอง (Double Check Role Security)
    // คิวรีเช็คที่ตาราง profiles อีกครั้งว่าคนยิง API นี้เป็น 'admin' ของกิลด์นี้จริงไหม เพื่อป้องกันคนแอบยิงสคริปต์แก้ไขข้อมูล
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('role, guild_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'ไม่พบข้อมูลโปรไฟล์ตัวละครของคุณในระบบ' }
    }

    // 👍 คราวนี้บรรทัดนี้จะไม่แดง และจะไม่ขึ้น Type Error ตอน Build แล้วครับ!
    if (profile.role !== 'admin' || profile.guild_id !== guildId) {
      return { success: false, error: '💥 คุณไม่มีสิทธิ์เข้าถึงหรือแก้ไขข้อมูลระบบกิลด์นี้เด็ดขาด' }
    }

    // 3. 💾 เริ่มทำการบันทึกอัปเดตข้อมูลลงตาราง guilds
    // อัปเดตเฉพาะ ฟิลด์ที่เปิดสิทธิ์ให้แก้ ส่วน URL กิลด์ และรหัสเชิญจะปลอดภัย 100% เพราะไม่มีในคำสั่งนี้
    const { error: updateError } = await (supabase as any) // 🌟 เติม (supabase as any) ครอบไว้ตรงนี้ครับ
      .from('guilds')
      .update({
        name: data.name.trim(),
        description: data.description.trim(), 
        discord_link: data.discordLink.trim() || null,
        logo_url: data.logoUrl?.trim() || null,
        primary_color: data.primaryColor?.trim() || null,
        discord_webhook_url: data.discordWebhookUrl?.trim() || null,
        hall_of_fame_gold_uid: data.hallOfFameGoldUid || null,
        hall_of_fame_silver_uid: data.hallOfFameSilverUid || null,
        hall_of_fame_bronze_uid: data.hallOfFameBronzeUid || null,
      })
      .eq('id', guildId)

    if (updateError) {
      console.error('Update guild database error:', updateError.message)
      return { success: false, error: 'บันทึกข้อมูลลงฐานข้อมูลล้มเหลว: ' + updateError.message }
    }

    // 4. 🔄 สั่งให้ Next.js ทำการล้างข้อมูลหน้าเก่าที่เคยแคชไว้ (Revalidate)
    // เพื่อให้เวลาหน้าเว็บโหลดใหม่ จะดึงชื่อกิลด์และรายละเอียดที่แก้ไขล่าสุดไปโชว์ในทันทีไม่ต้องกดรีเฟรชเอง
    revalidatePath('/guild/edit')

    return { 
      success: true 
    }

  } catch (error: any) {
    console.error('Unexpected error in updateGuildAction:', error)
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดที่ไม่รู้จักในระบบเซิร์ฟเวอร์หลังบ้าน'
    }
  }
}