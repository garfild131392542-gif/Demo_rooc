'use client'

import { useRef, useState } from 'react'
import { Profile } from './Dashboard'

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

// ─── Job cell colour ────────────────────────────────────────────────────────
function jobStyle(jobName: string): React.CSSProperties {
  const job = (jobName || '').toLowerCase()

  if (job === 'paladin') return { background: '#b91c1c', color: '#fff' }
  if (['assasin', 'assassin'].includes(job)) return { background: '#d8b4fe' }
  if (job === 'wizard') return { background: '#93c5fd' }
  if (['monk', 'priest'].includes(job)) return { background: '#bbf7d0' }
  if (['bard', 'gypsy', 'sniper'].includes(job)) return { background: '#fef08a' }
  if (['biochemist', 'mastersmith', 'whitesmith'].includes(job)) return { background: '#ffedd5' }
  if (job === 'sage') return { background: '#bfdbfe' }
  if (['knight', 'lord knight'].includes(job)) return { background: '#dc2626', color: '#fff' }
  if (job === 'rogue') return { background: '#e9d5ff' }
  if (job === 'summoner') return { background: '#f9a8d4' }  // pink-300
  return {}
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
}

export default function ExportModal({ profiles, onClose }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const parties = Array.from({ length: 16 }, (_, i) => i + 1)

  async function handleDownload() {
    if (!gridRef.current) return
    setExporting(true)
    try {
      const html2canvas: Html2Canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.download = 'party-lineup.jpg'
      link.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 overflow-y-auto py-6 px-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1120px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl shrink-0">
          <h2 className="text-base font-bold text-gray-800">📊 พรีวิว &amp; Export ตาราง Party</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
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
              gridTemplateColumns: `repeat(4, ${TABLE_WIDTH}px)`,
              gap: 6,
              background: '#ffffff',
              padding: 8,
              width: TABLE_WIDTH * 4 + 6 * 3 + 16,
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
                    width: TABLE_WIDTH,
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
                    {rows.map((member, idx) => (
                      <tr key={idx} style={{ height: ROW_HEIGHT }}>
                        <td style={{ ...cellBase, textAlign: 'left', height: ROW_HEIGHT, ...(member ? {} : { color: '#9ca3af', fontStyle: 'italic' }) }}>
                          {member?.display_name ?? 'ว่าง'}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center', height: ROW_HEIGHT, ...(member ? jobStyle(member.job_name) : { color: '#9ca3af' }) }}>
                          {member?.job_name ?? ''}
                        </td>
                        <td style={{ ...cellBase, textAlign: 'center', height: ROW_HEIGHT }} />
                      </tr>
                    ))}
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
