'use client'

import { useRef, useState } from 'react'
import { Profile } from './Dashboard'
import { getJobIconUrl } from '@/components/helpers' // อย่าลืม import ฟังก์ชันดึงรูปมาใช้
import { toJpeg } from 'html-to-image'

type Html2Canvas = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>

interface Props {
  profiles: Profile[]
  onClose: () => void
}

// ─── Party header colour (inline style, not Tailwind — safer for html2canvas) ─
function partyHeaderBg(partyId: number): string {
  if (partyId <= 4) return '#e9d5ff'  // purple-200
  if (partyId <= 8) return '#fdba74'  // orange-300
  if (partyId <= 12) return '#86efac'  // green-300
  return '#fef08a'                     // yellow-200
}

const SLOTS = 5
const TABLE_WIDTH = 260
const ROW_HEIGHT = 22   // px — every data row has the same height
const COL_W = { name: '44%', job: '34%', pos: '22%' }

const cellBase: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2px 4px',
  fontSize: 10,
  fontFamily: 'Arial, sans-serif',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  maxWidth: 0,
  color: '#000', // บังคับตัวหนังสือสีดำเสมอเพื่อตอน Export
}

export default function ExportModal({ profiles, onClose }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const parties = Array.from({ length: 16 }, (_, i) => i + 1)

  async function handleDownload() {
    if (!gridRef.current) return
    setExporting(true)

    try {
      // ใช้ html-to-image แทน html2canvas
      const dataUrl = await toJpeg(gridRef.current, {
        quality: 0.95, // ความชัด 95%
        backgroundColor: '#ffffff', // พื้นหลังสีขาว
        pixelRatio: 2, // ความคมชัด x2 (เหมือน scale: 2 ของเดิม)
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = 'party-lineup.jpg'
      link.click()

    } catch (error) {
      console.error('Export Error:', error)
      alert('เกิดข้อผิดพลาดในการ Export รูปภาพ กรุณาลองใหม่อีกครั้งครับ')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 overflow-y-auto py-6 px-3">
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-[1180px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="text-base font-bold text-gray-800">📊 พรีวิว & Export ตาราง Party</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {exporting ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>กำลัง Export…</>
              ) : <>⬇️ Download JPEG</>}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="overflow-auto p-4">
          {/* ── Captured element ── */}
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)', // 💡 แบ่งความกว้างเป็น 4 ส่วนเท่าๆ กันอัตโนมัติ
              gap: 16,
              background: '#ffffff',
              padding: 16,
              minWidth: '1000px', // 💡 บังคับความกว้างขั้นต่ำ เพื่อไม่ให้ตารางบี้เกินไปในจอเล็ก
            }}
          >
            {parties.map(partyId => {
              const members = profiles
                .filter(p => p.party_id === partyId)
                .sort((a, b) => (a.slot_index ?? 99) - (b.slot_index ?? 99))

              const rows: (Profile | null)[] = Array.from({ length: SLOTS }, (_, i) =>
                members.find(m => m.slot_index === i) ?? null
              )

              const hdrBg = partyHeaderBg(partyId)

              return (
                <table
                  key={partyId}
                  style={{
                    width: '100%', // 💡 เปลี่ยนจาก TABLE_WIDTH เป็น '100%' เพื่อให้มันขยายเต็มช่อง 1fr โดยอัตโนมัติ
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  <colgroup>
                    <col style={{ width: COL_W.name }} />
                    <col style={{ width: COL_W.job }} />
                    <col style={{ width: COL_W.pos }} />
                  </colgroup>
                  <thead>
                    {/* Party name row */}
                    <tr>
                      <th
                        colSpan={3}
                        style={{
                          ...cellBase,
                          background: hdrBg,
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: 11,
                          padding: '3px 4px',
                          maxWidth: 'none',
                        }}
                      >
                        Party {partyId}
                      </th>
                    </tr>
                    {/* Column header row */}
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
                      // ตรวจสอบว่าเป็นสล็อตแรก (หัวหน้า) หรือไม่
                      const isFirstSlot = idx === 0;
                      const positionText = (member && isFirstSlot) ? 'หัวหน้า' : '';

                      return (
                        <tr key={idx} style={{ height: ROW_HEIGHT }}>
                          {/* ชื่อตัวละคร */}
                          <td style={{ ...cellBase, textAlign: 'left', height: ROW_HEIGHT, ...(member ? {} : { color: '#9ca3af', fontStyle: 'italic' }) }}>
                            {member?.display_name ?? 'ว่าง'}
                          </td>

                          {/* อาชีพ (ใช้รูปไอคอน) */}
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

                          {/* ตำแหน่ง (หัวหน้า) */}
                          <td style={{ ...cellBase, textAlign: 'center', height: ROW_HEIGHT, fontWeight: (member && isFirstSlot) ? 700 : 400 }}>
                            {positionText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}