'use client'

type LeaderboardProfile = {
  id: string
  display_name: string
  job_name: string
  pvp_reduc: number
  pvp_dmg: number
}

function getJobColor(jobName: string) {
  const job = (jobName || '').toLowerCase()

  if (['knight', 'paladin'].includes(job)) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
  if (['biochemist', 'whitesmith'].includes(job)) {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }
  if (['bard', 'gypsy', 'sniper'].includes(job)) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  }
  if (['monk', 'priest'].includes(job)) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }
  if (['assasin', 'assassin', 'rogue'].includes(job)) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }
  if (['wizard', 'sage'].includes(job)) {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

export default function LeaderboardTable({ profiles }: { profiles: LeaderboardProfile[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ลำดับ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ชื่อตัวละคร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อาชีพ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PvP Reduc</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PvP DMG</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {profiles.map((profile, index) => (
              <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                  {profile.display_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getJobColor(profile.job_name)}`}>
                    {profile.job_name || 'None'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {profile.pvp_reduc}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-600 dark:text-rose-400">
                  {profile.pvp_dmg}
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
