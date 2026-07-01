'use client'

import { useRef, useState } from 'react'
import { Profile } from './Dashboard'
import { getJobIconUrl } from '@/components/helpers'
import { toJpeg } from 'html-to-image'

interface Props {
  profiles: Profile[]
  onClose: () => void
}

// Group background colors (soft pastel colors for header banners)
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

export default function ExportModal({ profiles, onClose }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  // Config panel collapse state
  const [isConfigOpen, setIsConfigOpen] = useState(true)

  // Config states
  const [bannerTitle, setBannerTitle] = useState('แผนจัดทีม Guild War (GvG)')
  const [activePreset, setActivePreset] = useState<'gvg' | 'dungeon' | 'temple' | 'league' | 'custom'>('gvg')
  const [groupNames, setGroupNames] = useState<string[]>([
    'ทีมบุกหลัก',
    'ทีมกันบ้าน',
    'ทีมเคลียร์หิน',
    'ทีมป่วน/ซัปพอร์ต'
  ])

  // Dynamic party range limits per group (Group 1 End, Group 2 End, Group 3 End)
  const [group1End, setGroup1End] = useState(4)
  const [group2End, setGroup2End] = useState(8)
  const [group3End, setGroup3End] = useState(12)

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

  // Get start/end party IDs for a group index (0-3)
  const getGroupPartiesRange = (groupIdx: number) => {
    let start = 1
    let end = 16

    if (groupIdx === 0) {
      end = group1End
    } else if (groupIdx === 1) {
      start = group1End + 1
      end = group2End
    } else if (groupIdx === 2) {
      start = group2End + 1
      end = group3End
    } else if (groupIdx === 3) {
      start = group3End + 1
      end = 16
    }

    if (start > end) return []
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  // Handle Preset Changes
  const handlePresetChange = (preset: 'gvg' | 'dungeon' | 'temple' | 'league' | 'custom') => {
    setActivePreset(preset)

    if (preset === 'league') {
      setBannerTitle('แผนจัดทีม Guild League (กิลด์ลีก)')
      setGroupNames([
        'ห้องหลัก',
        'ห้องรอง',
        'ไม่ได้ใช้งาน',
        'ไม่ได้ใช้งาน'
      ])
      setGroup1End(8)
      setGroup2End(16)
      setGroup3End(16)
    } else {
      // Reset to default ranges when changing preset (4, 8, 12)
      setGroup1End(4)
      setGroup2End(8)
      setGroup3End(12)

      if (preset === 'gvg') {
        setBannerTitle('แผนจัดทีม Guild War (GvG)')
        setGroupNames([
          'ทีมบุกหลัก',
          'ทีมกันบ้าน',
          'ทีมเคลียร์หิน',
          'ทีมป่วน/ซัปพอร์ต'
        ])
      } else if (preset === 'dungeon') {
        setBannerTitle('แผนจัดทีมดันเจี้ยนกิลด์ (Guild Dungeon)')
        setGroupNames([
          'ทีมทางซ้าย',
          'ทีมทางขวา',
          'ทีมกลางกิลด์',
          'ทีมเฝ้าระวัง'
        ])
      } else if (preset === 'temple') {
        setBannerTitle('แผนจัดทีมวิหารกิลด์ (Guild Temple)')
        setGroupNames([
          'ทีมบอสใหญ่',
          'ทีมมอนสเตอร์รอง',
          'ทีมสนับสนุน',
          'ทีมกองหนุน'
        ])
      } else if (preset === 'custom') {
        setBannerTitle('แผนจัดทีมกิจกรรมกิลด์')
        setGroupNames([
          'กลุ่มที่ 1',
          'กลุ่มที่ 2',
          'กลุ่มที่ 3',
          'กลุ่มที่ 4'
        ])
      }
    }
  }

  const handleGroupNameChange = (idx: number, value: string) => {
    setGroupNames(prev => {
      const updated = [...prev]
      updated[idx] = value
      return updated
    })
  }

  async function handleDownload() {
    if (!gridRef.current) return
    setExporting(true)

    try {
      const dataUrl = await toJpeg(gridRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${bannerTitle.replace(/\s+/g, '_') || 'party-lineup'}.jpg`
      link.click()
    } catch (error) {
      console.error('Export Error:', error)
      alert('เกิดข้อผิดพลาดในการ Export รูปภาพ กรุณาลองใหม่อีกครั้งครับ')
    } finally {
      setExporting(false)
    }
  }

  // Render a single party table
  const renderPartyTable = (partyId: number, groupIdx: number) => {
    const members = profiles
      .filter(p => p.party_id === partyId)
      .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99))

    const rows: (Profile | null)[] = Array.from({ length: SLOTS }, (_, i) =>
      members.find(m => m.slot_index === i) ?? null
    )

    const theme = GROUP_THEMES[groupIdx]

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
                background: theme.headerBg,
                color: theme.textCol,
                borderColor: theme.borderCol,
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
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl w-full max-w-[1240px] flex flex-col overflow-hidden max-h-[92vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-250 bg-gray-50 shrink-0">
          <h2 className="text-md font-bold text-gray-800 flex items-center gap-1.5">
            📊 จัดแต่งและนำออกตารางกิจกรรมปาร์ตี้
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              {exporting ? 'กำลังบันทึกรูป...' : '⬇️ Download รูปภาพ (JPEG)'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-grow relative bg-gray-100">
          
          {/* LEFT SIDE: Configuration Panel */}
          <div 
            style={{
              width: isConfigOpen ? '320px' : '0px',
              padding: isConfigOpen ? '20px' : '0px',
              borderRightWidth: isConfigOpen ? '1px' : '0px',
              opacity: isConfigOpen ? 1 : 0,
              transition: 'all 300ms ease-in-out',
            }}
            className={`bg-gray-50/50 border-gray-200 shrink-0 flex flex-col gap-4 ${
              isConfigOpen ? 'overflow-y-auto' : 'overflow-hidden pointer-events-none'
            }`}
          >
            {/* Presets Selection */}
            <div className="space-y-1">
              <label className="text-xxs font-bold text-gray-450 uppercase tracking-widest block">กิจกรรมที่ลง (Presets)</label>
              <select
                value={activePreset}
                onChange={(e) => handlePresetChange(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-xxs"
              >
                <option value="gvg">🏰 Guild War (GvG)</option>
                <option value="dungeon">🎋 Guild Dungeon (ดันกิลด์)</option>
                <option value="temple">👑 Guild Temple (วิหาร)</option>
                <option value="league">⚔️ Guild League (กิลด์ลีก)</option>
                <option value="custom">⚙️ Custom (ปรับแต่งเอง)</option>
              </select>
            </div>

            {/* Banner Title */}
            <div className="space-y-1">
              <label className="text-xxs font-bold text-gray-450 uppercase tracking-widest block">หัวข้อใหญ่ของกิจกรรม (Title)</label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="ชื่อกิจกรรม..."
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-indigo-500 shadow-xxs"
              />
            </div>

            {/* Group Names & Ranges Customizations */}
            <div className="space-y-3.5 border-t border-gray-200/80 pt-3">
              <label className="text-xxs font-bold text-gray-450 uppercase tracking-widest block mb-1">ขอบเขต & ชื่อของแต่ละกลุ่ม</label>
              
              {/* Group 1 */}
              <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xxs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_THEMES[0].headerBg }} />
                    กลุ่มที่ 1
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span>ปาร์ตี้ 1 ถึง</span>
                    <select
                      value={group1End}
                      onChange={(e) => updateGroup1End(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-250 rounded px-1.5 py-0.5 text-[10px]"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={groupNames[0]}
                  onChange={(e) => handleGroupNameChange(0, e.target.value)}
                  placeholder="ชื่อกลุ่มภารกิจ 1..."
                  className="w-full bg-slate-50/50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none"
                />
              </div>

              {/* Group 2 */}
              {group1End < 16 && (
                <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xxs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_THEMES[1].headerBg }} />
                      กลุ่มที่ 2
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span>ปาร์ตี้ {group1End + 1} ถึง</span>
                      <select
                        value={group2End}
                        onChange={(e) => updateGroup2End(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-255 rounded px-1.5 py-0.5 text-[10px]"
                      >
                        {Array.from({ length: 16 - (group1End + 1) + 1 }, (_, i) => group1End + 1 + i).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={groupNames[1]}
                    onChange={(e) => handleGroupNameChange(1, e.target.value)}
                    placeholder="ชื่อกลุ่มภารกิจ 2..."
                    className="w-full bg-slate-50/50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none"
                  />
                </div>
              )}

              {/* Group 3 */}
              {group2End < 16 && (
                <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xxs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_THEMES[2].headerBg }} />
                      กลุ่มที่ 3
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span>ปาร์ตี้ {group2End + 1} ถึง</span>
                      <select
                        value={group3End}
                        onChange={(e) => updateGroup3End(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-255 rounded px-1.5 py-0.5 text-[10px]"
                      >
                        {Array.from({ length: 16 - (group2End + 1) + 1 }, (_, i) => group2End + 1 + i).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={groupNames[2]}
                    onChange={(e) => handleGroupNameChange(2, e.target.value)}
                    placeholder="ชื่อกลุ่มภารกิจ 3..."
                    className="w-full bg-slate-50/50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none"
                  />
                </div>
              )}

              {/* Group 4 */}
              {group3End < 16 && (
                <div className="space-y-1 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xxs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_THEMES[3].headerBg }} />
                      กลุ่มที่ 4
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      ปาร์ตี้ {group3End + 1} ถึง 16
                    </span>
                  </div>
                  <input
                    type="text"
                    value={groupNames[3]}
                    onChange={(e) => handleGroupNameChange(3, e.target.value)}
                    placeholder="ชื่อกลุ่มภารกิจ 4..."
                    className="w-full bg-slate-50/50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none"
                  />
                </div>
              )}

            </div>

          </div>

          {/* COLLAPSE/TOGGLE SIDEBAR BUTTON */}
          <button
            onClick={() => setIsConfigOpen(prev => !prev)}
            className="absolute top-1/2 -translate-y-1/2 z-40 bg-indigo-600 hover:bg-indigo-700 text-white w-5 h-14 rounded-r-lg shadow-md border-y border-r border-indigo-700 transition-all flex items-center justify-center cursor-pointer select-none text-[10px]"
            style={{
              left: isConfigOpen ? '320px' : '0px',
              transition: 'left 300ms ease-in-out',
            }}
            title={isConfigOpen ? 'ซ่อนการตั้งค่า' : 'แสดงการตั้งค่า'}
          >
            {isConfigOpen ? '◀' : '▶'}
          </button>

          {/* RIGHT SIDE: Live Image Preview */}
          <div className="flex-grow overflow-auto p-6 bg-gray-100 flex items-start justify-center">
            
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
                  แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม • อัปเดตล่าสุด ณ วันที่ {new Date().toLocaleDateString('th-TH')}
                </p>
              </div>

              {/* Render the 4 groups sequentially with dynamic ranges */}
              {groupNames.map((name, groupIdx) => {
                const partiesList = getGroupPartiesRange(groupIdx)
                if (partiesList.length === 0) return null

                const theme = GROUP_THEMES[groupIdx]
                const startPartyId = partiesList[0]
                const endPartyId = partiesList[partiesList.length - 1]

                return (
                  <div key={groupIdx} style={{ gridColumn: 'span 4', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {/* Group Header Label */}
                    <div 
                      style={{ 
                        gridColumn: 'span 4', 
                        background: theme.headerBg, 
                        borderLeft: `5px solid ${theme.textCol}`,
                        padding: '6px 12px', 
                        borderRadius: '4px',
                        marginTop: groupIdx === 0 ? 0 : 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h2 style={{ fontSize: 12, fontWeight: 'bold', color: theme.textCol, margin: 0, fontFamily: 'sans-serif' }}>
                        🚩 {name} (Party {startPartyId} - {endPartyId})
                      </h2>
                    </div>

                    {/* All tables in this group */}
                    {partiesList.map(partyId => renderPartyTable(partyId, groupIdx))}
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