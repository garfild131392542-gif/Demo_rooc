'use client'

import { useRef, useState, useEffect } from 'react'
import { Profile } from './Dashboard'
import { getJobIconUrl } from '@/components/helpers'
import { captureAndDownload } from '@/lib/export-image'

interface Props {
  profiles: Profile[]
  onClose: () => void
  activity?: 'general' | 'guild_league' | 'emperium_overrun'
  partyTeams?: Record<number, 'defense' | 'offense' | 'runner'>
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

export default function ExportModal({ profiles, onClose, activity, partyTeams }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  // Config states
  const [bannerTitle, setBannerTitle] = useState('แผนจัดทีม Guild War (GvG)')
  const [activePreset, setActivePreset] = useState<'gvg' | 'dungeon' | 'temple' | 'league' | 'emperium_overrun' | 'custom'>('gvg')
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
    if (activePreset === 'emperium_overrun' && partyTeams) {
      if (groupIdx === 0) {
        return Object.keys(partyTeams).filter(k => partyTeams[Number(k)] === 'defense').map(Number).sort((a, b) => a - b)
      } else if (groupIdx === 1) {
        return Object.keys(partyTeams).filter(k => partyTeams[Number(k)] === 'offense').map(Number).sort((a, b) => a - b)
      } else if (groupIdx === 2) {
        return Object.keys(partyTeams).filter(k => partyTeams[Number(k)] === 'runner').map(Number).sort((a, b) => a - b)
      } else {
        return []
      }
    }

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
  const handlePresetChange = (preset: 'gvg' | 'dungeon' | 'temple' | 'league' | 'emperium_overrun' | 'custom') => {
    setActivePreset(preset)

    if (preset === 'league') {
      setBannerTitle('แผนจัดทีม Guild League (กิลด์ลีก)')
      setGroupNames([
        'ทีมหลัก(40คน)',
        'ทีมรอง(40คน)',
        'ไม่ได้ใช้งาน',
        'ไม่ได้ใช้งาน'
      ])
      setGroup1End(8)
      setGroup2End(16)
      setGroup3End(16)
    } else if (preset === 'emperium_overrun') {
      setBannerTitle('แผนจัดทีม Emperium Overrun')
      setGroupNames([
        'ทีมป้องกันบ้าน',
        'ทีมบุก',
        'ทีมวิ่งบ้าน',
        'ไม่ได้ใช้งาน'
      ])
      if (partyTeams) {
        const defenseCount = Object.values(partyTeams).filter(v => v === 'defense').length
        const offenseCount = Object.values(partyTeams).filter(v => v === 'offense').length
        setGroup1End(defenseCount)
        setGroup2End(defenseCount + offenseCount)
        setGroup3End(16)
      } else {
        setGroup1End(6)
        setGroup2End(12)
        setGroup3End(16)
      }
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

  useEffect(() => {
    if (activity === 'guild_league') {
      handlePresetChange('league');
    } else if (activity === 'emperium_overrun') {
      handlePresetChange('emperium_overrun');
    } else {
      handlePresetChange('gvg');
    }
  }, [activity, partyTeams]);

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