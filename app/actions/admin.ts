'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

// ---- Members CRUD ----
export async function createMember(formData: FormData) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const uid_game = formData.get('uid_game') as string
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  const role = formData.get('role') as 'admin' | 'member'
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0

  const { error } = await supabase
    .from('profiles')
    .insert([{ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg, last_stat_update: new Date().toISOString() }])

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function updateMember(id: string, formData: FormData) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const uid_game = formData.get('uid_game') as string
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  const role = formData.get('role') as 'admin' | 'member'
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0

  const { error } = await supabase
    .from('profiles')
    .update({ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg, last_stat_update: new Date().toISOString() } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function deleteMember(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

// ---- Credentials ----
export async function resetMemberPassword(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ password_game: null } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  return { success: true }
}

export async function clearMemberParty(id: string) {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      party_id: null,
      slot_index: null // หรือชื่อคอลัมน์ตำแหน่งในปาร์ตี้ของคุณ
    } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function changeMemberRole(id: string, newRole: 'admin' | 'member') {
  await checkAdmin()
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}

export async function toggleMemberLeave(id: string, is_on_leave: boolean) {
  await checkAdmin()
  const supabase = await createAdminClient()

  // Logic: ถ้าสถานะลาเป็น true ให้ล้างค่าปาร์ตี้และตำแหน่งทันที
  const updateData: any = { is_on_leave };
  if (is_on_leave === true) {
    updateData.party_id = null;
    updateData.slot_index = null;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/credentials')
  revalidatePath('/')
  return { success: true }
}
