import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user?.id)
    .single()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Welcome Card */}
      <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {profile?.display_name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your guild members, check statistics, and invite new members.
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
          Total Members
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
          On Leave
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
          Invites Sent
        </h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
      </div>
    </div>
  )
}
