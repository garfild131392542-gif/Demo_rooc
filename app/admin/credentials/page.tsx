import { createClient } from '@/lib/supabase/server'
import CredentialsTable from './CredentialsTable'

export default async function AdminCredentialsPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, uid_game, display_name, job_name, role, password_game, pvp_reduc, pvp_dmg, is_on_leave, updated_at')
    .order('id', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading credentials.</div>
  }

  // We map profiles to only expose what's necessary
  const managementData = profiles.map(p => ({
    id: p.id,
    uid_game: p.uid_game,
    display_name: p.display_name,
    job_name: p.job_name,
    role: p.role,
    pvp_reduc: p.pvp_reduc,
    pvp_dmg: p.pvp_dmg,
    isPasswordSet: p.password_game !== null,
    is_on_leave: p.is_on_leave || false,
    updated_at: p.updated_at
  }))

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 ">
      <h1 className="text-3xl font-bold mb-6">รายชื่อสมาชิกในกิล</h1>

      <CredentialsTable initialData={managementData} />
    </div>
  )
}
