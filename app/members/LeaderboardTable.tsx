'use client'

import { useState } from 'react'
import { getJobIconUrl } from '@/components/helpers'

// 1. เพิ่ม 6 ค่าใหม่เข้ามาใน Type
type LeaderboardProfile = {
  id: string
  display_name: string
  job_name: string
  pvp_reduc: number
  pvp_dmg: number
  p_def: number
  m_def: number
  p_atk: number
  m_atk: number
  p_dmg: number
  m_dmg: number
  p_reduc: number
  m_reduc: number
}

export default function LeaderboardTable({ profiles }: { profiles: LeaderboardProfile[] }) {
  const [selectedJob, setSelectedJob] = useState<string>('All')

  const JOB_OPTIONS = [
    'Lord Knight', 'Paladin', 'Biochemist', 'Mastersmith', 'Bard', 'Gypsy',
    'Sniper', 'Champion', 'Priest', 'Assassin', 'Rogue', 'Wizard', 'Sage', 'Summoner'
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
    'champion': 8,
    'priest': 9,
    'assassin': 10,
    'assaain': 10,
    'rogue': 11,
    'rough': 11,
    'wizard': 12,
    'sage': 13,
    'summoner': 14
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">อาชีพ</th>
                {/* 2. เพิ่มหัวตารางให้ครบ 10 ค่า */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P.ATK</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">M.ATK</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P.DEF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">M.DEF</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P.DMG(%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">M.DMG(%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P.Reduc(%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">M.Reduc(%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PvP DMG</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PvP Reduc</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {profile.job_name ? (
                      <div className="flex justify-center items-center">
                        <img
                          src={getJobIconUrl(profile.job_name)}
                          alt={profile.job_name}
                          className="w-8 h-8 object-contain drop-shadow-sm"
                          title={profile.job_name}
                        />
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">None</span>
                    )}
                  </td>
                  {/* 3. เพิ่มข้อมูลให้ครบ 10 ค่าพร้อมกำหนดสีให้ดูง่าย */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500 dark:text-red-400">
                    {profile.p_atk ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-500 dark:text-orange-400">
                    {profile.m_atk ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-500 dark:text-blue-400">
                    {profile.p_def ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-500 dark:text-purple-400">
                    {profile.m_def ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-500">
                    {profile.p_dmg ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600 dark:text-orange-500">
                    {profile.m_dmg ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-500">
                    {profile.p_reduc ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600 dark:text-purple-500">
                    {profile.m_reduc ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-600 dark:text-rose-400">
                    {profile.pvp_dmg ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {profile.pvp_reduc ?? 0}
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  {/* 4. ปรับ colSpan เป็น 13 ให้ครอบคลุมทุกคอลัมน์ */}
                  <td colSpan={13} className="px-6 py-4 text-center text-sm text-gray-500">
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