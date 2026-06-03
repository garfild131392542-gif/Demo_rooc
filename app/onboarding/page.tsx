import { OnboardingForm } from './OnboardingForm'
import { createClient } from '@/lib/supabase/server'

export default async function OnboardingPage() {
  const supabase = createClient()

  // Get current user and guild
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('guild_id, display_name')
    .eq('id', user.id)
    .single()

  const guildId = profile?.guild_id

  if (!guildId) {
    return <div>No guild found</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            สร้างกิลด์ของคุณ
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            ทำการตั้งค่าพื้นฐานและสร้างลิงก์เชิญของคุณ
          </p>
          <OnboardingForm guildId={guildId} />
        </div>
      </div>
    </div>
  )
}

