'use client'

import { useRef, useState, useEffect } from 'react'
import { Profile } from './Dashboard'
import { getJobIconUrl } from '@/components/helpers'
import { captureAndDownload } from '@/lib/export-image'
import { CustomTeamGroup } from '@/types/database'
import { TEAM_COLOR_MAP } from './PartyBlock'

interface Props {
  profiles: Profile[]
  onClose: () => void
  activity?: 'general' | 'guild_league' | 'emperium_overrun'
  customGroups?: CustomTeamGroup[]
  planTitle?: string
  planSubtitle?: string
  partyTeams?: Record<number, 'defense' | 'offense' | 'runner'>
}

// Fallback group background colors (soft pastel colors for header banners)
const GROUP_THEMES = [
  { headerBg: '#e9d5ff', textCol: '#6b21a8', borderCol: '#d8b4fe', label: 'Group 1' },  // Purple
  { headerBg: '#fed7aa', textCol: '#9a3412', borderCol: '#fdba74', label: 'Group 2' },  // Orange
  { headerBg: '#dcfce7', textCol: '#166534', borderCol: '#86efac', label: 'Group 3' }, // Green
  { headerBg: '#fef9c3', textCol: '#854d0e', borderCol: '#fef08a', label: 'Group 4' }, // Yellow
]

const SLOTS = 5
const ROW_HEIGHT = 22

const cellBase: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2.5px 4px',
  fontSize: 10,
  fontFamily: 'Arial, sans-serif',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maxWidth: 0,
  color: '#000', // Black text is required for clear contrast in printed images
}

export default function ExportModal({ profiles, onClose, activity, customGroups, planTitle, planSubtitle, partyTeams }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  // Config states
  const [bannerTitle, setBannerTitle] = useState(planTitle || 'แผนจัดทีม Emperium Overrun')
  const [bannerSubtitle, setBannerSubtitle] = useState(planSubtitle || 'แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
  const [activePreset, setActivePreset] = useState<'gvg' | 'dungeon' | 'temple' | 'league' | 'emperium_overrun' | 'custom'>('emperium_overrun')
  const [localCustomGroups, setLocalCustomGroups] = useState<CustomTeamGroup[]>(customGroups || [])

  // Dynamic party range limits per group for non-custom presets
  const [group1End, setGroup1End] = useState(4)
  const [group2End, setGroup2End] = useState(8)
  const [group3End, setGroup3End] = useState(12)

  useEffect(() => {
    if (customGroups && customGroups.length > 0) {
      setLocalCustomGroups(customGroups)
    }
  }, [customGroups])

  // Safe range updators to prevent overlap/invalidation
  const updateGroup1End = (val: number) => {
    setGroup1End(val)
    if (val >= group2End) {
      setGroup2End(Math.min(16, val + 1))
      if (Math.min(16, val + 1) >= group3End) {
        setGroup3End(Math.min(16, val + 2))
      }
    }
  }

  const updateGroup2End = (val: number) => {
    if (val <= group1End) return
    setGroup2End(val)
    if (val >= group3End) {
      setGroup3End(Math.min(16, val + 1))
    }
  }

  const updateGroup3End = (val: number) => {
    if (val <= group2End) return
    setGroup3End(val)
  }

  // Handle Preset Changes
  const handlePresetChange = (preset: 'gvg' | 'dungeon' | 'temple' | 'league' | 'emperium_overrun' | 'custom') => {
    setActivePreset(preset)

    if (preset === 'league') {
      setBannerTitle('แผนจัดทีม Guild League (กิลด์ลีก)')
      setBannerSubtitle('แผนจัดทัพกำลังพลกิลด์ 40v40 ประจำกิจกรรม')
      setLocalCustomGroups([
        { id: 'main', name: 'ทีมหลัก (40 คน)', icon: '🛡️', colorTheme: 'indigo', partyIds: [1, 2, 3, 4, 5, 6, 7, 8] },
        { id: 'sub', name: 'ทีมรอง (40 คน)', icon: '⚔️', colorTheme: 'purple', partyIds: [9, 10, 11, 12, 13, 14, 15, 16] },
      ])
    } else if (preset === 'emperium_overrun' || preset === 'custom') {
      setBannerTitle(planTitle || 'แผนจัดทีม Emperium Overrun')
      setBannerSubtitle(planSubtitle || 'แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
      if (customGroups && customGroups.length > 0) {
        setLocalCustomGroups(customGroups)
      } else {
        setLocalCustomGroups([
          { id: 'defense', name: 'ทีมป้องกันบ้าน', icon: '🏰', colorTheme: 'blue', partyIds: [1, 2, 3, 4, 5, 6] },
          { id: 'offense', name: 'ทีมบุก', icon: '🔥', colorTheme: 'rose', partyIds: [7, 8, 9, 10, 11, 12] },
          { id: 'runner', name: 'ทีมวิ่งบ้าน', icon: '⚡', colorTheme: 'amber', partyIds: [13, 14, 15, 16] },
        ])
      }
    } else if (preset === 'gvg') {
      setBannerTitle('แผนจัดทีม Guild War (GvG)')
      setBannerSubtitle('แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
      setLocalCustomGroups([
        { id: 'gvg_1', name: 'ทีมบุกหลัก', icon: '🔥', colorTheme: 'rose', partyIds: [1, 2, 3, 4] },
        { id: 'gvg_2', name: 'ทีมกันบ้าน', icon: '🏰', colorTheme: 'blue', partyIds: [5, 6, 7, 8] },
        { id: 'gvg_3', name: 'ทีมเคลียร์หิน', icon: '⚡', colorTheme: 'amber', partyIds: [9, 10, 11, 12] },
        { id: 'gvg_4', name: 'ทีมป่วน/ซัปพอร์ต', icon: '🎯', colorTheme: 'purple', partyIds: [13, 14, 15, 16] },
      ])
    }
  }

  useEffect(() => {
    if (activity === 'guild_league') {
      handlePresetChange('league');
    } else if (activity === 'emperium_overrun') {
      handlePresetChange('emperium_overrun');
    } else {
      handlePresetChange('custom');
    }
  }, [activity, customGroups]);

  const handleGroupNameChange = (idx: number, value: string) => {
    setLocalCustomGroups(prev => {
      const updated = [...prev]
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], name: value }
      }
      return updated
    })
  }

  async function handleDownload() {
    if (!gridRef.current) return
    setExporting(true)

    try {
      const filename = `${bannerTitle.replace(/\s+/g, '_') || 'party-lineup'}.jpg`
      await captureAndDownload(gridRef.current, filename, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })
    } catch (error) {
      console.error('Export Error:', error)
      alert('เกิดข้อผิดพลาดในการ Export รูปภาพ กรุณาลองใหม่อีกครั้งครับ')
    } finally {
      setExporting(false)
    }
  }

  // Render a single party table
  const renderPartyTable = (partyId: number, colorTheme: string) => {
    const members = profiles
      .filter(p => p.party_id === partyId)
      .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99))

    const rows: (Profile | null)[] = Array.from({ length: SLOTS }, (_, i) =>
      members.find(m => m.slot_index === i) ?? null
    )

    const colorMeta = (TEAM_COLOR_MAP as any)[colorTheme] || TEAM_COLOR_MAP.blue

    return (
      <table
        key={partyId}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontFamily: 'Arial, sans-serif',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <colgroup>
          <col style={{ width: '44%' }} />
          <col style={{ width: '34%' }} />
          <col style={{ width: '22%' }} />
        </colgroup>
        <thead>
          <tr>
            <th
              colSpan={3}
              style={{
                ...cellBase,
                background: colorMeta.hexBg,
                color: colorMeta.hexText,
                borderColor: colorMeta.hexBorder,
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 11,
                padding: '4px 4px',
                maxWidth: 'none',
              }}
            >
              Party {partyId}
            </th>
          </tr>
          <tr>
            {(['ชื่อตัวละคร', 'อาชีพ', 'ตำแหน่ง'] as const).map(h => (
              <th
                key={h}
                style={{
                  ...cellBase,
                  background: '#f3f4f6',
                  textAlign: 'center',
                  fontWeight: 600,
                  maxWidth: 'none',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((member, idx) => {
            const isFirstSlot = idx === 0
            const positionText = (member && isFirstSlot) ? 'หัวหน้า' : ''

            return (
              <tr key={idx} style={{ height: ROW_HEIGHT }}>
                {/* Character Name */}
                <td style={{ ...cellBase, textAlign: 'left', height: ROW_HEIGHT, ...(member ? {} : { color: '#9ca3af', fontStyle: 'italic' }) }}>
                  {member?.display_name ?? 'ว่าง'}
                </td>

                {/* Job & Icon */}
                <td style={{ ...cellBase, textAlign: 'left', height: ROW_HEIGHT }}>
                  {member ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'left', gap: '2px' }}>
                      <img
                        src={getJobIconUrl(member.job_name)}
                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        alt=""
                      />
                      <span style={{ fontSize: '9px' }}>{member.job_name}</span>
                    </div>
                  ) : ''}
                </td>

                {/* Position (Leader) */}
                <td style={{ ...cellBase, textAlign: 'center', height: ROW_HEIGHT, fontWeight: (member && isFirstSlot) ? 705 : 400 }}>
                  {positionText}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4">
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-[1300px] flex flex-col overflow-hidden max-h-[94vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="text-base font-bold text-gray-800">
                จัดแต่งและนำออกรูปภาพแผนจัดทัพ (Export Image)
              </h2>
              <p className="text-xs text-gray-500">
                ปรับแต่งข้อความและตรวจสอบตัวอย่างภาพก่อนดาวน์โหลด
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm"
            >
              {exporting ? 'กำลังบันทึกรูป...' : '⬇️ Download รูปภาพ (JPEG)'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col lg:flex-row overflow-hidden flex-grow relative bg-gray-100">
          
          {/* LEFT SIDE: Customization Controls */}
          <div className="w-full lg:w-80 bg-white border-r border-gray-200 p-5 overflow-y-auto shrink-0 space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                🎯 เลือกรูปแบบ (Preset)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePresetChange('emperium_overrun')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                    activePreset === 'emperium_overrun' || activePreset === 'custom'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-xs'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  🏰 แผนกำหนดเอง / Emperium Overrun
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('league')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                    activePreset === 'league'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  🏆 Guild League (40v40)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('gvg')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${
                    activePreset === 'gvg'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  ⚔️ Guild War (GvG ทั่วไป)
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  หัวข้อรูปภาพ (Banner Title)
                </label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  คำบรรยาย (Subtitle)
                </label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-gray-200">
              <label className="block text-xs font-bold text-gray-700">
                👥 ชื่อกลุ่มทีมในรูปภาพ
              </label>
              {localCustomGroups.map((group, idx) => (
                <div key={group.id || idx} className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <span>{group.icon}</span> กลุ่มที่ {idx + 1} ({group.partyIds.length} ปาร์ตี้)
                  </span>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => handleGroupNameChange(idx, e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: Live Image Preview */}
          <div className="flex-grow overflow-auto p-6 bg-gray-200/70 flex items-start justify-center">
            
            {/* ─── CAPTURED ELEMENT ─── */}
            <div
              ref={gridRef}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                background: '#ffffff',
                padding: '24px 20px',
                minWidth: '1080px',
                maxWidth: '1120px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            >
              {/* Header Title Section */}
              <div 
                style={{ 
                  gridColumn: 'span 4', 
                  textAlign: 'center', 
                  marginBottom: 10,
                  borderBottom: '2.5px solid #1e293b', 
                  paddingBottom: 14 
                }}
              >
                <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1e293b', margin: 0, fontFamily: 'sans-serif' }}>
                  {bannerTitle}
                </h1>
                <p style={{ fontSize: 11, color: '#475569', margin: '6px 0 0 0', fontWeight: 600 }}>
                  {bannerSubtitle} • อัปเดตล่าสุด ณ วันที่ {new Date().toLocaleDateString('th-TH')}
                </p>
              </div>

              {/* Render dynamic custom groups */}
              {localCustomGroups.map((group, groupIdx) => {
                const partiesList = group.partyIds || []
                if (partiesList.length === 0) return null

                const colorMeta = (TEAM_COLOR_MAP as any)[group.colorTheme] || TEAM_COLOR_MAP.blue

                return (
                  <div key={group.id || groupIdx} style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {/* Group Header Label */}
                    <div 
                      style={{ 
                        gridColumn: 'span 4', 
                        background: colorMeta.hexBg, 
                        borderLeft: `5px solid ${colorMeta.hexText}`,
                        padding: '6px 12px', 
                        borderRadius: '4px',
                        marginTop: groupIdx === 0 ? 0 : 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h2 style={{ fontSize: 12, fontWeight: 'bold', color: colorMeta.hexText, margin: 0, fontFamily: 'sans-serif' }}>
                        {group.icon} {group.name} (Party {partiesList.join(', ')})
                      </h2>
                    </div>

                    {/* All tables in this group */}
                    {partiesList.map(partyId => renderPartyTable(partyId, group.colorTheme))}
                  </div>
                )
              })}

            </div>

          </div>

        </div>

      </div>
    </div>
  )
}