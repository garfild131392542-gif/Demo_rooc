'use client'

import { useRef, useState, useMemo } from 'react'
import { getJobIconUrl } from '@/components/helpers'
import { captureAndDownload } from '@/lib/export-image'

export type MemberExportProfile = {
  id: string
  display_name: string | null
  job_name: string | null
  cp: number | null
  pvp_reduc: number | null
  pvp_dmg: number | null
  p_def: number | null
  m_def: number | null
  p_atk: number | null
  m_atk: number | null
  hp: number | null
  sp: number | null
  party_id: number | null
  slot_index: number | null
  party_id_guild_league?: number | null
  party_id_emperium_overrun?: number | null
  is_on_leave?: boolean | null
}

interface Props {
  profiles: MemberExportProfile[]
  guildName?: string
  initialActivity?: 'general' | 'guild_league' | 'emperium_overrun'
  onClose: () => void
}

const JOB_ORDER: Record<string, number> = {
  'lord knight': 1,
  knight: 1,
  paladin: 2,
  biochemist: 3,
  creator: 3,
  mastersmith: 4,
  whitesmith: 4,
  bard: 5,
  minstrel: 5,
  gypsy: 6,
  sniper: 7,
  champion: 8,
  priest: 9,
  highpriest: 9,
  assassin: 10,
  rogue: 11,
  stalker: 11,
  wizard: 12,
  sage: 13,
  professor: 13,
  summoner: 14,
  rebellion: 15,
}

const cellBase: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '4px 6px',
  fontSize: 10,
  fontFamily: 'Arial, sans-serif',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  color: '#0f172a',
}

export default function MemberExportModal({ profiles, guildName = 'WomanCat', initialActivity = 'general', onClose }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  // Configuration options
  const [activity, setActivity] = useState<'general' | 'guild_league' | 'emperium_overrun'>(initialActivity)
  const [bannerTitle, setBannerTitle] = useState<string>(() => {
    if (initialActivity === 'guild_league') return 'ผังสมาชิกห้องหลักและห้องรอง (Guild League 40v40)'
    if (initialActivity === 'emperium_overrun') return 'ผังสมาชิกห้องหลักและห้องรอง (Emperium Overrun)'
    return 'ผังสมาชิกห้องหลักและห้องรอง (ทั่วไป P.1-16)'
  })
  const [bannerSubtitle, setBannerSubtitle] = useState<string>(
    'เปรียบเทียบสเตตัสกำลังพลแยกตามสายอาชีพ (ทีมหลัก ปาร์ตี้ 1-8 และ ทีมรอง ปาร์ตี้ 9-16)'
  )
  const [sortBy, setSortBy] = useState<string>('cp')

  // 🌟 Map active party based on selected activity
  const activeProfiles = useMemo(() => {
    return profiles.map((p) => {
      let activePartyId = p.party_id

      if (activity === 'guild_league') {
        activePartyId = p.party_id_guild_league ?? null
      } else if (activity === 'emperium_overrun') {
        activePartyId = p.party_id_emperium_overrun ?? null
      }

      return {
        ...p,
        party_id: activePartyId,
      }
    })
  }, [profiles, activity])

  // Sorting comparator
  const sortFn = useMemo(() => {
    return (a: MemberExportProfile, b: MemberExportProfile) => {
      if (sortBy === 'cp') return (b.cp || 0) - (a.cp || 0)
      if (sortBy === 'cp_asc') return (a.cp || 0) - (b.cp || 0)
      if (sortBy === 'pvp_dmg') return (b.pvp_dmg || 0) - (a.pvp_dmg || 0)
      if (sortBy === 'pvp_reduc') return (b.pvp_reduc || 0) - (a.pvp_reduc || 0)
      if (sortBy === 'p_atk') return (b.p_atk || 0) - (a.p_atk || 0)
      if (sortBy === 'm_atk') return (b.m_atk || 0) - (a.m_atk || 0)
      if (sortBy === 'p_def') return (b.p_def || 0) - (a.p_def || 0)
      if (sortBy === 'm_def') return (b.m_def || 0) - (a.m_def || 0)
      if (sortBy === 'hp') return (b.hp || 0) - (a.hp || 0)
      if (sortBy === 'sp') return (b.sp || 0) - (a.sp || 0)
      if (sortBy === 'party') return (a.party_id || 99) - (b.party_id || 99)
      if (sortBy === 'name') return (a.display_name || '').localeCompare(b.display_name || '')
      if (sortBy === 'job') {
        const oA = JOB_ORDER[(a.job_name || '').toLowerCase()] || 99
        const oB = JOB_ORDER[(b.job_name || '').toLowerCase()] || 99
        if (oA !== oB) return oA - oB
        return (b.cp || 0) - (a.cp || 0)
      }
      return (a.party_id || 99) - (b.party_id || 99)
    }
  }, [sortBy])

  // แยกสมาชิกห้องหลัก (ปาร์ตี้ 1-8)
  const mainMembers = useMemo(() => {
    return activeProfiles
      .filter((p) => p.party_id && p.party_id >= 1 && p.party_id <= 8)
      .sort(sortFn)
  }, [activeProfiles, sortFn])

  // แยกสมาชิกห้องรอง (ปาร์ตี้ 9-16)
  const subMembers = useMemo(() => {
    return activeProfiles
      .filter((p) => p.party_id && p.party_id >= 9 && p.party_id <= 16)
      .sort(sortFn)
  }, [activeProfiles, sortFn])

  // จัดกลุ่มตามสายอาชีพสำหรับห้องหลัก
  const mainJobs = useMemo(() => {
    const map: Record<string, MemberExportProfile[]> = {}
    mainMembers.forEach((p) => {
      const job = p.job_name || 'ไม่ระบุอาชีพ'
      if (!map[job]) map[job] = []
      map[job].push(p)
    })

    const sortedJobKeys = Object.keys(map).sort((a, b) => {
      const orderA = JOB_ORDER[a.toLowerCase()] || 99
      const orderB = JOB_ORDER[b.toLowerCase()] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.localeCompare(b)
    })

    return sortedJobKeys.map((job) => ({
      jobName: job,
      members: map[job],
    }))
  }, [mainMembers])

  // จัดกลุ่มตามสายอาชีพสำหรับห้องรอง
  const subJobs = useMemo(() => {
    const map: Record<string, MemberExportProfile[]> = {}
    subMembers.forEach((p) => {
      const job = p.job_name || 'ไม่ระบุอาชีพ'
      if (!map[job]) map[job] = []
      map[job].push(p)
    })

    const sortedJobKeys = Object.keys(map).sort((a, b) => {
      const orderA = JOB_ORDER[a.toLowerCase()] || 99
      const orderB = JOB_ORDER[b.toLowerCase()] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.localeCompare(b)
    })

    return sortedJobKeys.map((job) => ({
      jobName: job,
      members: map[job],
    }))
  }, [subMembers])

  async function handleDownload() {
    if (!gridRef.current) return
    setExporting(true)

    try {
      const filename = `${(bannerTitle || 'guild-members-comparison').replace(/\s+/g, '_')}.jpg`
      await captureAndDownload(gridRef.current, filename, {
        quality: 0.95,
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        width: 1240,
      })
    } catch (error) {
      console.error('Export Error:', error)
      alert('เกิดข้อผิดพลาดในการ Export รูปภาพ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setExporting(false)
    }
  }

  // เรนเดอร์การ์ดตารางสำหรับแต่ละสายอาชีพ (ตรงตามที่ผู้ใช้ส่งมาในรูป media_1788418123048.png)
  const renderJobCard = (
    jobName: string,
    members: MemberExportProfile[],
    teamType: 'main' | 'sub'
  ) => {
    const isMain = teamType === 'main'
    const headerBg = isMain ? '#eff6ff' : '#faf5ff'
    const headerBorder = isMain ? '#bfdbfe' : '#e9d5ff'
    const badgeBg = isMain ? '#dbeafe' : '#f3e8ff'
    const badgeText = isMain ? '#1e40af' : '#6b21a8'
    const partyBadgeBg = isMain ? '#eff6ff' : '#faf5ff'
    const partyBadgeText = isMain ? '#1d4ed8' : '#7e22ce'
    const partyBadgeBorder = isMain ? '#bfdbfe' : '#e9d5ff'

    return (
      <div
        key={jobName}
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Job Card Header */}
        <div
          style={{
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={getJobIconUrl(jobName)}
              alt=""
              style={{ width: '20px', height: '20px', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
              {jobName}
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background: badgeBg,
              color: badgeText,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {members.length} คน
          </span>
        </div>

        {/* Table inside Card */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ ...cellBase, textAlign: 'center', fontWeight: 700, fontSize: 10, color: '#64748b' }}>#</th>
              <th style={{ ...cellBase, textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#64748b' }}>ชื่อตัวละคร</th>
              <th style={{ ...cellBase, textAlign: 'center', fontWeight: 700, fontSize: 10, color: '#64748b' }}>ปาร์ตี้</th>
              <th style={{ ...cellBase, textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#64748b' }}>CP</th>
              <th style={{ ...cellBase, textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#64748b' }}>PvP DMG</th>
              <th style={{ ...cellBase, textAlign: 'right', fontWeight: 700, fontSize: 10, color: '#64748b' }}>PvP Reduc</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, idx) => (
              <tr
                key={m.id}
                style={{
                  background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <td style={{ ...cellBase, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 10 }}>
                  {idx + 1}
                </td>
                <td style={{ ...cellBase, textAlign: 'left', fontWeight: 700, color: '#0f172a', fontSize: 11 }}>
                  {m.display_name || '-'}
                </td>
                <td style={{ ...cellBase, textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1.5px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: partyBadgeBg,
                      color: partyBadgeText,
                      border: `1px solid ${partyBadgeBorder}`,
                    }}
                  >
                    P.{m.party_id || '?'}
                  </span>
                </td>
                <td style={{ ...cellBase, textAlign: 'right', fontWeight: 800, color: '#d97706', fontSize: 11, fontFamily: 'monospace' }}>
                  {m.cp ? m.cp.toLocaleString() : '-'}
                </td>
                <td style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: '#e11d48', fontSize: 11, fontFamily: 'monospace' }}>
                  {m.pvp_dmg ? `${m.pvp_dmg}%` : '-'}
                </td>
                <td style={{ ...cellBase, textAlign: 'right', fontWeight: 700, color: '#2563eb', fontSize: 11, fontFamily: 'monospace' }}>
                  {m.pvp_reduc ? `${m.pvp_reduc}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-[1400px] flex flex-col overflow-hidden max-h-[96vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-base font-black text-gray-900">
                ส่งออกรูปภาพเปรียบเทียบประสิทธิภาพสมาชิก (Export Image)
              </h2>
              <p className="text-xs text-gray-500">
                เลือกรูปแบบการจัดกลุ่ม (แยกตามอาชีพ หรือ แยกห้องหลัก/ห้องรอง) และตรวจสอบตัวอย่างก่อนดาวน์โหลด
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className={`cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${
                showSidebar
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{showSidebar ? '◀ ซ่อนแถบตั้งค่า' : '⚙️ ปรับแต่ง'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              {exporting ? 'กำลังบันทึกรูป...' : '⬇️ Download รูปภาพ (JPEG)'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col lg:flex-row overflow-hidden flex-grow relative bg-gray-100">
          {/* Controls Sidebar */}
          {showSidebar && (
            <div className="w-full lg:w-84 bg-white border-r border-gray-200 p-4.5 overflow-y-auto shrink-0 space-y-4">
              {/* 🌟 Activity Selector: เลือกแผนจัดปาร์ตี้ */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                  🛡️ แผนปาร์ตี้อ้างอิง (Activity Lineup)
                </label>
                <div className="grid grid-cols-1 gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActivity('general')
                      setBannerTitle('ผังสมาชิกห้องหลักและห้องรอง (ทั่วไป P.1-16)')
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                      activity === 'general'
                        ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>📂</span>
                    <span>ทั่วไป (1-16 ปาร์ตี้)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivity('guild_league')
                      setBannerTitle('ผังสมาชิกห้องหลักและห้องรอง (Guild League 40v40)')
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                      activity === 'guild_league'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    <span>🏆</span>
                    <span>Guild League (40v40)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivity('emperium_overrun')
                      setBannerTitle('ผังสมาชิกห้องหลักและห้องรอง (Emperium Overrun)')
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                      activity === 'emperium_overrun'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-orange-600'
                    }`}
                  >
                    <span>🏰</span>
                    <span>Emperium Overrun / Custom</span>
                  </button>
                </div>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                  🔢 เรียงลำดับสมาชิกตาม
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="cp">ค่าพลังรบ CP (มาก ➔ น้อย)</option>
                  <option value="cp_asc">ค่าพลังรบ CP (น้อย ➔ มาก)</option>
                  <option value="pvp_dmg">PvP DMG (%) (มาก ➔ น้อย)</option>
                  <option value="pvp_reduc">PvP Reduc (%) (มาก ➔ น้อย)</option>
                  <option value="p_atk">P.ATK (มาก ➔ น้อย)</option>
                  <option value="m_atk">M.ATK (มาก ➔ น้อย)</option>
                  <option value="p_def">P.DEF (มาก ➔ น้อย)</option>
                  <option value="m_def">M.DEF (มาก ➔ น้อย)</option>
                  <option value="hp">Max HP (มาก ➔ น้อย)</option>
                  <option value="sp">Max SP (มาก ➔ น้อย)</option>
                  <option value="party">เลขปาร์ตี้ (Party 1 ➔ 16)</option>
                  <option value="name">ชื่อตัวละคร (A-Z / ก-ฮ)</option>
                  <option value="job">ลำดับสายอาชีพ (Job Order)</option>
                </select>
              </div>

              {/* Text Customization */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 mb-1">
                    ชื่อหัวข้อรูปภาพ (Banner Title)
                  </label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-800 mb-1">
                    คำบรรยาย (Subtitle)
                  </label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Area */}
          <div className="flex-grow overflow-auto p-4 sm:p-6 bg-slate-200/80 flex items-start justify-center">
            {/* ─── CAPTURED CANVAS CONTAINER ─── */}
            {/* ─── CAPTURED CANVAS CONTAINER (Exact Match to User's Screenshot media_1788418123048.png) ─── */}
            <div
              ref={gridRef}
              style={{
                width: '1240px',
                minWidth: '1240px',
                background: '#f8fafc',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {/* Image Header */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>🛡️</span>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 900,
                        color: '#2563eb',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {guildName || 'ROOC Guild'}
                    </span>
                  </div>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
                    {bannerTitle}
                  </h1>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
                    {bannerSubtitle}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <span
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      🛡️ ห้องหลัก {mainMembers.length} คน
                    </span>
                    <span
                      style={{
                        background: '#faf5ff',
                        color: '#7e22ce',
                        border: '1px solid #e9d5ff',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      ⚔️ ห้องรอง {subMembers.length} คน
                    </span>
                  </div>
                  <p style={{ fontSize: '10px', color: '#94a3b8', margin: '6px 0 0 0' }}>
                    ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>

              {/* 🌟 Section 1: ห้องหลัก (Main Team) - ปาร์ตี้ 1 - 8 */}
              <div style={{ marginBottom: '28px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid #bfdbfe',
                    paddingBottom: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>🛡️</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#1e3a8a' }}>
                          ห้องหลัก (Main Team)
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          ปาร์ตี้ 1 - 8
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#3b82f6', margin: '2px 0 0 0', fontWeight: 600 }}>
                        จำนวนสมาชิก {mainMembers.length} คน • พบ {mainJobs.length} สายอาชีพ
                      </p>
                    </div>
                  </div>
                </div>

                {mainJobs.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    {mainJobs.map(({ jobName, members }) => renderJobCard(jobName, members, 'main'))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1',
                      color: '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    ไม่พบสมาชิกในห้องหลัก
                  </div>
                )}
              </div>

              {/* 🌟 Section 2: ห้องรอง (Sub Team) - ปาร์ตี้ 9 - 16 */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid #e9d5ff',
                    paddingBottom: '8px',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>⚔️</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#581c87' }}>
                          ห้องรอง (Sub Team)
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#f3e8ff',
                            color: '#7e22ce',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: '1px solid #e9d5ff',
                          }}
                        >
                          ปาร์ตี้ 9 - 16
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: '#8b5cf6', margin: '2px 0 0 0', fontWeight: 600 }}>
                        จำนวนสมาชิก {subMembers.length} คน • พบ {subJobs.length} สายอาชีพ
                      </p>
                    </div>
                  </div>
                </div>

                {subJobs.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    {subJobs.map(({ jobName, members }) => renderJobCard(jobName, members, 'sub'))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1',
                      color: '#94a3b8',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    ไม่พบสมาชิกในห้องรอง
                  </div>
                )}
              </div>

              {/* Image Footer */}
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  color: '#94a3b8',
                }}
              >
                <span>ระบบบริหารจัดการกิลด์ ROOC Management • www.rooc-manage.xyz</span>
                <span>สร้างโดยหัวหน้ากิลด์เพื่อใช้ตรวจสอบและวิเคราะห์การจัดทัพ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
