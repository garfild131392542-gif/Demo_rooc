'use client'

import { useState } from 'react'
import { getJobIconUrl } from '@/components/helpers'

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

const SORT_OPTIONS = [
  { label: 'ค่าเริ่มต้น (เรียงตามอาชีพ)', value: 'default' },
  { label: 'P.ATK', value: 'p_atk' },
  { label: 'M.ATK', value: 'm_atk' },
  { label: 'P.DEF', value: 'p_def' },
  { label: 'M.DEF', value: 'm_def' },
  { label: 'P.DMG (%)', value: 'p_dmg' },
  { label: 'M.DMG (%)', value: 'm_dmg' },
  { label: 'P.Reduc (%)', value: 'p_reduc' },
  { label: 'M.Reduc (%)', value: 'm_reduc' },
  { label: 'PvP DMG', value: 'pvp_dmg' },
  { label: 'PvP Reduc', value: 'pvp_reduc' },
]

export default function LeaderboardTable({ profiles }: { profiles: LeaderboardProfile[] }) {
  const [selectedJob, setSelectedJob] = useState<string>('All')
  const [sortBy, setSortBy] = useState<string>('default')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const JOB_OPTIONS = [
    'Lord Knight', 'Paladin', 'Biochemist', 'Mastersmith', 'Bard', 'Gypsy',
    'Sniper', 'Champion', 'Priest', 'Assassin', 'Rogue', 'Wizard', 'Sage', 'Summoner'
  ]

  const JOB_ORDER: Record<string, number> = {
    'knight': 1, 'lord knight': 1, 'paladin': 2, 'biochemist': 3, 'mastersmith': 4,
    'whitesmith': 4, 'bard': 5, 'gypsy': 6, 'sniper': 7, 'champion': 8, 'priest': 9,
    'assassin': 10, 'assaain': 10, 'rogue': 11, 'rough': 11, 'wizard': 12, 'sage': 13, 'summoner': 14
  }

  const sortedProfiles = [...profiles].sort((a, b) => {
    if (sortBy === 'default') {
      const jobA = (a.job_name || '').toLowerCase()
      const jobB = (b.job_name || '').toLowerCase()
      const orderA = JOB_ORDER[jobA] || 99
      const orderB = JOB_ORDER[jobB] || 99

      if (orderA !== orderB) return orderA - orderB
      return (b.pvp_dmg || 0) - (a.pvp_dmg || 0)
    } else {
      const valA = (a as any)[sortBy] || 0
      const valB = (b as any)[sortBy] || 0
      return sortOrder === 'desc' ? valB - valA : valA - valB
    }
  })

  const filteredProfiles = selectedJob === 'All'
    ? sortedProfiles
    : sortedProfiles.filter(p => (p.job_name || '').toLowerCase() === selectedJob.toLowerCase())

  // สร้างฟังก์ชันตกแต่งอันดับ Top 3 แบบคลีนๆ
  const renderRank = (index: number) => {
    if (index === 0) return <span className="text-yellow-500 font-black tracking-tighter">#1</span>
    if (index === 1) return <span className="text-slate-400 font-bold tracking-tighter">#2</span>
    if (index === 2) return <span className="text-amber-700 dark:text-amber-600 font-bold tracking-tighter">#3</span>
    return <span className="text-slate-400 dark:text-slate-500 font-medium">#{index + 1}</span>
  }

  // ไฮไลท์คอลัมน์ที่เลือกแบบจางๆ
  const getHighlightClass = (colName: string) => {
    return sortBy === colName ? 'bg-slate-50/80 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 font-bold' : ''
  }

  return (
    <div className="space-y-4">
      
      {/* --- Toolbar มินิมอล --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* ตัวกรองอาชีพแบบเรียบๆ */}
          <div className="relative">
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
            >
              <option value="All">ทุกอาชีพรวมกัน</option>
              {JOB_OPTIONS.map(job => (
                <option key={job} value={job}>{job}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* ตัวจัดเรียงสเตตัสแบบเรียบๆ */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* ปุ่มสลับ ทิศทางแบบ Icon Only */}
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          disabled={sortBy === 'default'}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center font-medium"
        >
          {sortOrder === 'desc' ? (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg> มากไปน้อย</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path></svg> น้อยไปมาก</>
          )}
        </button>

      </div>

      {/* --- ตารางดีไซน์ใหม่ ไร้ขอบกลาง --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Rank</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Player</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap text-center">Class</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('p_atk')}`}>P.ATK</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('m_atk')}`}>M.ATK</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('p_def')}`}>P.DEF</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('m_def')}`}>M.DEF</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('p_dmg')}`}>P.DMG(%)</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('m_dmg')}`}>M.DMG(%)</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('p_reduc')}`}>P.Reduc(%)</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('m_reduc')}`}>M.Reduc(%)</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('pvp_dmg')}`}>PvP DMG</th>
                <th className={`px-6 py-4 font-medium whitespace-nowrap ${getHighlightClass('pvp_reduc')}`}>PvP Reduc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredProfiles.map((profile, index) => (
                <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  
                  {/* แสดงอันดับ */}
                  <td className="px-6 py-3 whitespace-nowrap">
                    {renderRank(index)}
                  </td>

                  {/* ชื่อตัวละคร */}
                  <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                    {profile.display_name}
                  </td>
                  
                  {/* อาชีพ */}
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                    {profile.job_name ? (
                      <div className="flex justify-center items-center">
                        <img
                          src={getJobIconUrl(profile.job_name)}
                          alt={profile.job_name}
                          className="w-7 h-7 object-contain opacity-90 hover:opacity-100 transition-opacity"
                          title={profile.job_name}
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  
                  {/* ข้อมูล Status (ใช้ font-mono เพื่อให้ตัวเลขตรงกันเหมือนตาราง Data) */}
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('p_atk')}`}>{profile.p_atk ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('m_atk')}`}>{profile.m_atk ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('p_def')}`}>{profile.p_def ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('m_def')}`}>{profile.m_def ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('p_dmg')}`}>{profile.p_dmg ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('m_dmg')}`}>{profile.m_dmg ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('p_reduc')}`}>{profile.p_reduc ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('m_reduc')}`}>{profile.m_reduc ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('pvp_dmg')}`}>{profile.pvp_dmg ?? 0}</td>
                  <td className={`px-6 py-3 whitespace-nowrap font-mono text-[13px] ${getHighlightClass('pvp_reduc')}`}>{profile.pvp_reduc ?? 0}</td>
                </tr>
              ))}

              {/* กรณีไม่มีข้อมูล */}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <svg className="w-10 h-10 mb-3 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบข้อมูลสมาชิกในอาชีพนี้</p>
                    </div>
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