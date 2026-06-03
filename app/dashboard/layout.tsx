import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { TrialBanner } from './TrialBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get profile and guild data
  const { data: profile } = await supabase
    .from('profiles')
    .select('guild_id, display_name')
    .eq('id', user.id)
    .single()

  const guildId = profile?.guild_id

  let guildData = null
  if (guildId) {
    const { data } = await supabase
      .from('guilds')
      .select('id, name, trial_ends_at')
      .eq('id', guildId)
      .single()
    guildData = data
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar guildName={guildData?.name || 'Guild'} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar userDisplayName={profile?.display_name || 'User'} />

        {/* Trial Banner & Content */}
        <div className="flex-1 overflow-auto">
          {guildData?.trial_ends_at && (
            <TrialBanner trialEndsAt={guildData.trial_ends_at} />
          )}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
