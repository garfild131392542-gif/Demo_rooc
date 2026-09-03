'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'
import { GuildAttendanceLog, SaveAttendancePayload } from '@/types/database'

/**
 * 🌟 ดึงรายการประวัติการเช็คชื่อทั้งหมดของกิลด์ (เรียงจากวันที่ล่าสุด)
 */
export async function getAttendanceLogs(customGuildId?: string): Promise<{
  success: boolean
  data?: GuildAttendanceLog[]
  error?: string
}> {
  try {
    const session = (await getSession()) as any
    const guildId = customGuildId || session?.profile?.guild_id

    if (!guildId) {
      return { success: false, error: 'ไม่พบกิลด์ของคุณในระบบ' }
    }

    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('guild_attendance_logs')
      .select('*')
      .eq('guild_id', guildId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching attendance logs:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data as GuildAttendanceLog[]) || [] }
  } catch (err: any) {
    console.error('getAttendanceLogs exception:', err)
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการโหลดประวัติการเช็คชื่อ' }
  }
}

/**
 * 🌟 ดึงข้อมูลรายละเอียดของ Log การเช็คชื่อ 1 รายการ
 */
export async function getAttendanceLogById(logId: string): Promise<{
  success: boolean
  data?: GuildAttendanceLog
  error?: string
}> {
  try {
    const session = (await getSession()) as any
    const guildId = session?.profile?.guild_id

    if (!guildId) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('guild_attendance_logs')
      .select('*')
      .eq('id', logId)
      .eq('guild_id', guildId)
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'ไม่พบข้อมูล Log นี้' }
    }

    return { success: true, data: data as GuildAttendanceLog }
  } catch (err: any) {
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาด' }
  }
}

/**
 * 🌟 บันทึกหรือแก้ไข Log การเช็คชื่อ (Create / Update)
 * - หากมี payload.id ส่งมา -> จะทำการ Update ข้อมูลเดิม
 * - หากไม่มี payload.id -> จะทำการ Insert เป็น Log ใหม่
 */
export async function saveAttendanceLog(payload: SaveAttendancePayload): Promise<{
  success: boolean
  data?: GuildAttendanceLog
  error?: string
}> {
  try {
    const session = (await getSession()) as any
    const userRole = session?.profile?.role
    const adminGuildId = session?.profile?.guild_id
    const currentUserId = session?.profile?.id
    const currentUserName = session?.profile?.display_name || 'แอดมิน'

    // 🔒 กั้นสิทธิ์เฉพาะแอดมิน/หัวหน้ากิลด์เท่านั้นที่บันทึกข้อมูลได้
    if (userRole !== 'admin' || !adminGuildId) {
      return { success: false, error: 'เฉพาะหัวหน้ากิลด์หรือแอดมินเท่านั้นที่สามารถบันทึกการเช็คชื่อได้' }
    }

    const records = payload.records || []
    const totalMembers = records.length
    const presentCount = records.filter((r) => r.status === 'present').length
    const absentCount = records.filter((r) => r.status === 'absent').length
    const leaveCount = records.filter((r) => r.status === 'leave').length

    const supabaseAdmin = await createAdminClient()

    if (payload.id) {
      // ✏️ โหมดแก้ไข Log เดิม (Update)
      const { data, error } = await (supabaseAdmin as any)
        .from('guild_attendance_logs')
        .update({
          title: payload.title.trim(),
          date: payload.date,
          activity_type: payload.activity_type || 'guild_league',
          note: payload.note || null,
          total_members: totalMembers,
          present_count: presentCount,
          absent_count: absentCount,
          leave_count: leaveCount,
          records: records,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .eq('guild_id', adminGuildId)
        .select()
        .single()

      if (error) {
        console.error('Error updating attendance log:', error.message)
        return { success: false, error: error.message }
      }

      revalidatePath('/members')
      return { success: true, data: data as GuildAttendanceLog }
    } else {
      // ➕ โหมดสร้าง Log ใหม่ (Insert)
      const { data, error } = await (supabaseAdmin as any)
        .from('guild_attendance_logs')
        .insert({
          guild_id: adminGuildId,
          title: payload.title.trim() || `เช็คชื่อวันที่ ${payload.date}`,
          date: payload.date || new Date().toISOString().split('T')[0],
          activity_type: payload.activity_type || 'guild_league',
          created_by: currentUserId || null,
          created_by_name: currentUserName,
          note: payload.note || null,
          total_members: totalMembers,
          present_count: presentCount,
          absent_count: absentCount,
          leave_count: leaveCount,
          records: records,
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting attendance log:', error.message)
        return { success: false, error: error.message }
      }

      revalidatePath('/members')
      return { success: true, data: data as GuildAttendanceLog }
    }
  } catch (err: any) {
    console.error('saveAttendanceLog exception:', err)
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' }
  }
}

/**
 * 🌟 ลบ Log การเช็คชื่อ (Delete)
 */
export async function deleteAttendanceLog(logId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = (await getSession()) as any
    const userRole = session?.profile?.role
    const adminGuildId = session?.profile?.guild_id

    // 🔒 กั้นสิทธิ์เฉพาะแอดมิน/หัวหน้ากิลด์เท่านั้นที่ลบได้
    if (userRole !== 'admin' || !adminGuildId) {
      return { success: false, error: 'เฉพาะหัวหน้ากิลด์หรือแอดมินเท่านั้นที่สามารถลบข้อมูลได้' }
    }

    const supabaseAdmin = await createAdminClient()

    const { error } = await (supabaseAdmin as any)
      .from('guild_attendance_logs')
      .delete()
      .eq('id', logId)
      .eq('guild_id', adminGuildId)

    if (error) {
      console.error('Error deleting attendance log:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/members')
    return { success: true }
  } catch (err: any) {
    console.error('deleteAttendanceLog exception:', err)
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' }
  }
}
