import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTacticalPlans } from '@/app/actions/tactics'
import TacticalBoardClient from '@/components/tactics/TacticalBoardClient'

export default async function TacticsPage() {
  const session = await getSession()
  const sessionAny = session as any
  const supabase = await createClient()

  if (!session) {
    redirect('/login')
  }

  const myGuildId = sessionAny?.profile?.guild_id
  if (!myGuildId) {
    redirect('/profile-setup')
  }

  const isAdmin = sessionAny?.profile?.role === 'admin'

  // Fetch profiles of guild members to pre-populate tactical board party list
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('guild_id', myGuildId)
    .order('id', { ascending: true })

  if (profilesError) {
    console.error('Error fetching profiles for tactics:', profilesError.message)
  }
  const profiles = profilesData || []

  // Fetch saved tactical plans
  const plansResult = await getTacticalPlans()
  const initialPlans = plansResult.success ? plansResult.plans : []

  return (
    <div className="w-full mt-4 max-w-[1720px] mx-auto px-4">
      <TacticalBoardClient
        initialProfiles={profiles}
        isAdmin={isAdmin}
        initialPlans={initialPlans}
      />
    </div>
  )
}
