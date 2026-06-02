'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from './auth'

export async function updateProfileParty(
  profileId: string, 
  partyId: number | null, 
  slotIndex: number | null
) {
  const session = (await getSession()) as any
  const role = session?.profile?.role
  if (role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('profiles')
    .update({ 
      party_id: partyId,
      slot_index: slotIndex 
    } as any)
    .eq('id', profileId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
