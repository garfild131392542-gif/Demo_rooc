'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function updateMyProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Not authenticated' }

  const supabase = await createClient()
  
  const display_name = formData.get('display_name') as string
  const job_name = formData.get('job_name') as string
  const pvp_reduc = parseInt(formData.get('pvp_reduc') as string) || 0
  const pvp_dmg = parseInt(formData.get('pvp_dmg') as string) || 0

  const { error } = await supabase
    .from('profiles')
    .update({ display_name, job_name, pvp_reduc, pvp_dmg } as any)
    .eq('id', session.id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}
