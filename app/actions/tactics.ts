'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all tactical plans for the user's guild
 */
export async function getTacticalPlans() {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const supabase = (await createAdminClient()) as any
    const { data: plans, error } = await supabase
      .from('tactical_plans')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, plans: plans || [] }
  } catch (err: any) {
    console.error('getTacticalPlans error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Save or update a tactical plan
 */
export async function saveTacticalPlan(
  planId: string | null,
  planName: string,
  mapName: string,
  notes: string,
  tokenPositions: any,
  drawings: any,
  partiesData: any
) {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = session.profile.role === 'admin'
    if (!isAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบในการวางแผนการรบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const supabase = (await createAdminClient()) as any

    if (planId) {
      // Update existing plan
      const { data, error } = await supabase
        .from('tactical_plans')
        .update({
          plan_name: planName,
          map_name: mapName,
          battle_notes: notes,
          token_positions: tokenPositions,
          drawings: drawings,
          parties_data: partiesData,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', planId)
        .eq('guild_id', guildId)
        .select()

      if (error) throw error
      revalidatePath('/tactics')
      return { success: true, plan: data?.[0] }
    } else {
      // Create new plan
      const { data, error } = await supabase
        .from('tactical_plans')
        .insert({
          guild_id: guildId,
          plan_name: planName,
          map_name: mapName,
          battle_notes: notes,
          token_positions: tokenPositions,
          drawings: drawings,
          parties_data: partiesData,
          created_by: session.profile.id,
        } as any)
        .select()

      if (error) throw error
      revalidatePath('/tactics')
      return { success: true, plan: data?.[0] }
    }
  } catch (err: any) {
    console.error('saveTacticalPlan error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a tactical plan
 */
export async function deleteTacticalPlan(planId: string) {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = session.profile.role === 'admin'
    if (!isAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const supabase = (await createAdminClient()) as any
    const { error } = await supabase
      .from('tactical_plans')
      .delete()
      .eq('id', planId)
      .eq('guild_id', guildId)

    if (error) throw error

    revalidatePath('/tactics')
    return { success: true }
  } catch (err: any) {
    console.error('deleteTacticalPlan error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Upload a custom map image to guild-maps bucket
 */
export async function uploadTacticalMap(formData: FormData) {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = session.profile.role === 'admin'
    if (!isAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'ไม่พบไฟล์ภาพที่ต้องการอัปโหลด' }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = (await createAdminClient()) as any
    const fileExt = file.name.split('.').pop()
    const filePath = `${guildId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('guild-maps')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('guild-maps')
      .getPublicUrl(filePath)

    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('uploadTacticalMap error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Upload a custom audio file to guild-maps bucket
 */
export async function uploadTacticalAudio(formData: FormData) {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = session.profile.role === 'admin'
    if (!isAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'ไม่พบไฟล์เสียงที่ต้องการอัปโหลด' }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = (await createAdminClient()) as any
    const fileExt = file.name.split('.').pop() || 'webm'
    const filePath = `${guildId}/audio-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('guild-maps')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('guild-maps')
      .getPublicUrl(filePath)

    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('uploadTacticalAudio error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Upload a custom video file to guild-maps bucket
 */
export async function uploadTacticalVideo(formData: FormData) {
  try {
    const session = (await getSession()) as any
    if (!session?.profile) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = session.profile.role === 'admin'
    if (!isAdmin) {
      return { success: false, error: 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ' }
    }

    const guildId = session.profile.guild_id
    if (!guildId) {
      return { success: false, error: 'สมาชิกไม่ได้สังกัดกิลด์' }
    }

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'ไม่พบไฟล์วิดีโอที่ต้องการอัปโหลด' }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = (await createAdminClient()) as any
    const fileExt = file.name.split('.').pop() || 'webm'
    const filePath = `${guildId}/video-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('guild-maps')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('guild-maps')
      .getPublicUrl(filePath)

    return { success: true, url: urlData.publicUrl }
  } catch (err: any) {
    console.error('uploadTacticalVideo error:', err)
    return { success: false, error: err.message }
  }
}
