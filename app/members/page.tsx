import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import LeaderboardTable from './LeaderboardTable'

export default async function MembersPage() {
  const session = await getSession()
  const supabase = await createClient()

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, job_name, pvp_reduc, pvp_dmg, p_def, m_def')
    .order('pvp_dmg', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-500">Error loading leaderboard.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">รายชื่อสมาชิก Explorers</h1>
      <div>

      </div>
      <LeaderboardTable profiles={profiles || []} />
    </div>
  )
}
