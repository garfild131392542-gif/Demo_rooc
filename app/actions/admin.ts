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
    .insert([{ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg }])

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
    .update({ uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg } as any)
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

  const { error } = await supabase
    .from('profiles')
    .update({ is_on_leave } as any)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/admin/credentials')
  revalidatePath('/members')
  revalidatePath('/')
  return { success: true }
}
