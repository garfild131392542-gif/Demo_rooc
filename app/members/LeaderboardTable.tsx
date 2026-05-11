'use client'

import { useState } from 'react'

type LeaderboardProfile = {
  id: string
  display_name: string
  job_name: string
  pvp_reduc: number
  pvp_dmg: number
}

function getJobColor(jobName: string) {
  const job = (jobName || '').toLowerCase()

  if (['lord knight', 'paladin'].includes(job)) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
  if (['biochemist', 'mastersmith'].includes(job)) {
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
  const [selectedJob, setSelectedJob] = useState<string>('All')

  const JOB_OPTIONS = [
    'Lord Knight', 'Paladin', 'Biochemist', 'Mastersmith', 'Bard', 'Gypsy',
    'Sniper', 'Monk', 'Priest', 'Assassin', 'Rogue', 'Wizard', 'Sage'
  ]

  const JOB_ORDER: Record<string, number> = {
    'knight': 1,
    'lord knight': 1,
    'paladin': 2,
    'biochemist': 3,
    'mastersmith': 4,
    'whitesmith': 4,
    'bard': 5,
    'gypsy': 6,
    'sniper': 7,
    'monk': 8,
    'priest': 9,
    'assassin': 10,
    'assaain': 10,
    'rogue': 11,
    'rough': 11,
    'wizard': 12,
    'sage': 13
  }

  const sortedProfiles = [...profiles].sort((a, b) => {
    const jobA = (a.job_name || '').toLowerCase()
    const jobB = (b.job_name || '').toLowerCase()
    const orderA = JOB_ORDER[jobA] || 99
    const orderB = JOB_ORDER[jobB] || 99

    if (orderA !== orderB) {
      return orderA - orderB
    }
    // ถ้าอาชีพเดียวกัน ให้เรียงตาม pvp_dmg จากมากไปน้อย
    return (b.pvp_dmg || 0) - (a.pvp_dmg || 0)
  })

  const filteredProfiles = selectedJob === 'All'
    ? sortedProfiles
    : sortedProfiles.filter(p => (p.job_name || '').toLowerCase() === selectedJob.toLowerCase())

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center gap-2">
        <label htmlFor="jobFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">กรองอาชีพ:</label>
        <select
          id="jobFilter"
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
        >
          <option value="All">-- ทุกอาชีพ --</option>
          {JOB_OPTIONS.map(job => (
            <option key={job} value={job}>{job}</option>
          ))}
        </select>
      </div>
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
              {filteredProfiles.map((profile, index) => (
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
              {filteredProfiles.length === 0 && (
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
    </div>
  )
}
