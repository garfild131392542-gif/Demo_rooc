import { createClient } from '@/lib/supabase/server'
import MembersTable from './MembersTable'

export default async function AdminMembersPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading members.</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Members</h1>
      <MembersTable initialProfiles={profiles || []} />
    </div>
  )
}
