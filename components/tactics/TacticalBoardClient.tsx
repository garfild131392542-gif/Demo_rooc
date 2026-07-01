'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { toJpeg } from 'html-to-image'
import { saveTacticalPlan, deleteTacticalPlan, uploadTacticalMap } from '@/app/actions/tactics'

// Standard RO GvG map configurations
const DEFAULT_MAPS = [
  { id: 'vale_of_clash', name: 'Vale of Clash', src: '/maps/vale_of_clash.png', fallbackBg: 'bg-emerald-950/40', emoji: '🌳' },
  { id: 'payon_gvg', name: 'Payon GvG', src: '/maps/payon_gvg.png', fallbackBg: 'bg-amber-950/40', emoji: '🎋' },
  { id: 'geffen_gvg', name: 'Geffen GvG', src: '/maps/geffen_gvg.png', fallbackBg: 'bg-violet-950/40', emoji: '🏰' },
  { id: 'prontera_gvg', name: 'Prontera GvG', src: '/maps/prontera_gvg.png', fallbackBg: 'bg-blue-950/40', emoji: '👑' },
]

// Default tokens matching the mockup
const DEFAULT_TOKENS = [
  { id: 1, name: 'Pirate', emoji: '🏴‍☠️', color: '#f43f5e', x: 250, y: 220, visible: true },
  { id: 2, name: 'IceWolf', emoji: '🐺', color: '#3b82f6', x: 620, y: 150, visible: true },
  { id: 3, name: 'Ghost', emoji: '👻', color: '#94a3b8', x: 380, y: 220, visible: true },
  { id: 4, name: 'Lion', emoji: '🦁', color: '#f59e0b', x: 320, y: 360, visible: true },
  { id: 5, name: 'GoldBug', emoji: '🐞', color: '#eab308', x: 450, y: 280, visible: true },
  { id: 6, name: 'Mushroom', emoji: '🍄', color: '#ef4444', x: 580, y: 230, visible: true },
  { id: 7, name: 'Cricket', emoji: '🦗', color: '#22c55e', x: 660, y: 380, visible: true },
  { id: 8, name: 'Poring', emoji: '🌸', color: '#ec4899', x: 720, y: 260, visible: true },
  { id: 9, name: 'Crown', emoji: '👑', color: '#a855f7', x: 200, y: 550, visible: true },
  { id: 10, name: 'Ninja', emoji: '🥷', color: '#14b8a6', x: 300, y: 550, visible: true },
  { id: 11, name: 'Phoenix', emoji: '🐦', color: '#f97316', x: 400, y: 550, visible: true },
  { id: 12, name: 'Dragon', emoji: '🐉', color: '#06b6d4', x: 500, y: 550, visible: true },
  { id: 13, name: 'Tiger', emoji: '🐯', color: '#84cc16', x: 600, y: 550, visible: true },
  { id: 14, name: 'Bear', emoji: '🐻', color: '#78350f', x: 700, y: 550, visible: true },
  { id: 15, name: 'Knight', emoji: '🛡️', color: '#6366f1', x: 800, y: 550, visible: true },
  { id: 16, name: 'Angel', emoji: '👼', color: '#d946ef', x: 900, y: 550, visible: true },
]

// Marker colors
const COLORS = [
  { value: '#ef4444', name: 'Red' },
  { value: '#eab308', name: 'Yellow' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#22c55e', name: 'Green' },
  { value: '#ffffff', name: 'White' },
  { value: '#000000', name: 'Black' },
]

interface TacticalBoardClientProps {
  initialProfiles: any[]
  isAdmin: boolean;
  initialPlans: any[]
}

export default function TacticalBoardClient({
  initialProfiles,
  isAdmin,
  initialPlans,
}: TacticalBoardClientProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  
  const [plans, setPlans] = useState<any[]>(initialPlans)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  
  const [selectedMapId, setSelectedMapId] = useState('vale_of_clash')
  const [customMapUrl, setCustomMapUrl] = useState<string | null>(null)
  const [mapsList, setMapsList] = useState(DEFAULT_MAPS)
  const [mapError, setMapError] = useState(false)
  
  const [battleNotes, setBattleNotes] = useState('')
  const [toolMode, setToolMode] = useState<'select' | 'draw' | 'arrow' | 'text' | 'erase'>('select')
  const [strokeColor, setStrokeColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)
  
  // Collapse Panels state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  // Drawing states
  const [drawings, setDrawings] = useState<any[]>([])
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[] | null>(null)
  const [currentArrowStart, setCurrentArrowStart] = useState<{x: number, y: number} | null>(null)
  const [currentArrowEnd, setCurrentArrowEnd] = useState<{x: number, y: number} | null>(null)
  
  // Text Tool states
  const [textInput, setTextInput] = useState({ x: 0, y: 0, visible: false, value: '' })
  
  // Tokens state
  const [tokens, setTokens] = useState(DEFAULT_TOKENS)
  const [draggedTokenId, setDraggedTokenId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Parties roster state (left panel)
  const [parties, setParties] = useState<any[]>(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const partyId = i + 1
      const defaultToken = DEFAULT_TOKENS.find(t => t.id === partyId)
      
      const partyProfiles = initialProfiles
        .filter((p: any) => p.party_id === partyId)
        .sort((a: any, b: any) => (a.slot_index ?? 99) - (b.slot_index ?? 99))
      
      const slots = Array.from({ length: 5 }, (_, slotIdx) => {
        const profile = partyProfiles.find((p: any) => p.slot_index === slotIdx)
        return profile ? profile.display_name : ''
      })

      return {
        id: partyId,
        name: defaultToken?.name || `Party ${partyId}`,
        notes: '',
        slots,
      }
    })
  })

  const [isPending, startTransition] = useTransition()
  const [imageExporting, setImageExporting] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  // Pre-fill active map URL
  const activeMap = mapsList.find(m => m.id === selectedMapId)
  const mapImageSrc = customMapUrl || activeMap?.src || '/maps/vale_of_clash.png'

  // Reset map load error when switching maps
  useEffect(() => {
    setMapError(false)
  }, [selectedMapId, customMapUrl])

  // Get coordinates (0 to 1000) relative to SVG viewBox
  const getCoordinates = (e: any) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    
    let clientX = 0
    let clientY = 0
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    const x = Math.round(((clientX - rect.left) / rect.width) * 1000)
    const y = Math.round(((clientY - rect.top) / rect.height) * 1000)
    return { x, y }
  }

  // Handle drawing events
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (toolMode === 'select' || toolMode === 'erase') return
    
    const coords = getCoordinates(e)
    if (!coords) return

    if (toolMode === 'draw') {
      setCurrentPath([coords])
    } else if (toolMode === 'arrow') {
      setCurrentArrowStart(coords)
      setCurrentArrowEnd(coords)
    } else if (toolMode === 'text') {
      setTextInput({
        x: coords.x,
        y: coords.y,
        visible: true,
        value: '',
      })
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e)
    if (!coords) return

    if (toolMode === 'draw' && currentPath) {
      setCurrentPath(prev => prev ? [...prev, coords] : [coords])
    } else if (toolMode === 'arrow' && currentArrowStart) {
      setCurrentArrowEnd(coords)
    }
  }

  const handleSvgMouseUp = () => {
    if (toolMode === 'draw' && currentPath && currentPath.length > 1) {
      setDrawings(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'freehand',
          points: currentPath,
          color: strokeColor,
          width: strokeWidth,
        },
      ])
      setCurrentPath(null)
    } else if (toolMode === 'arrow' && currentArrowStart && currentArrowEnd) {
      const dist = Math.hypot(currentArrowEnd.x - currentArrowStart.x, currentArrowEnd.y - currentArrowStart.y)
      if (dist > 10) {
        setDrawings(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'arrow',
            start: currentArrowStart,
            end: currentArrowEnd,
            color: strokeColor,
            width: strokeWidth,
          },
        ])
      }
      setCurrentArrowStart(null)
      setCurrentArrowEnd(null)
    }
  }

  // Eraser handler
  const handleElementClick = (elementId: string) => {
    if (toolMode !== 'erase') return
    setDrawings(prev => prev.filter(d => d.id !== elementId))
  }

  // Text label input save
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.value.trim()) {
      setDrawings(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'text',
          x: textInput.x,
          y: textInput.y,
          text: textInput.value,
          color: strokeColor,
        },
      ])
    }
    setTextInput({ x: 0, y: 0, visible: false, value: '' })
  }

  // Token dragging handlers
  const handleTokenStart = (e: any, tokenId: number) => {
    if (toolMode !== 'select') return
    e.preventDefault()
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const token = tokens.find(t => t.id === tokenId)
    if (!token) return
    
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    
    const factorX = rect.width / 1000
    const factorY = rect.height / 1000
    
    const tokenPixelsX = token.x * factorX
    const tokenPixelsY = token.y * factorY
    
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    
    dragOffset.current = {
      x: localX - tokenPixelsX,
      y: localY - tokenPixelsY,
    }
    
    setDraggedTokenId(tokenId)
  }

  useEffect(() => {
    const handleGlobalMove = (e: any) => {
      if (draggedTokenId === null || !svgRef.current) return
      
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      
      const rect = svgRef.current.getBoundingClientRect()
      
      const localX = clientX - rect.left - dragOffset.current.x
      const localY = clientY - rect.top - dragOffset.current.y
      
      const x = Math.max(0, Math.min(1000, Math.round((localX / rect.width) * 1000)))
      const y = Math.max(0, Math.min(1000, Math.round((localY / rect.height) * 1000)))
      
      setTokens(prev =>
        prev.map(t => (t.id === draggedTokenId ? { ...t, x, y } : t))
      )
    }

    const handleGlobalUp = () => {
      if (draggedTokenId !== null) {
        setDraggedTokenId(null)
      }
    }

    if (draggedTokenId !== null) {
      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalUp)
      window.addEventListener('touchmove', handleGlobalMove, { passive: false })
      window.addEventListener('touchend', handleGlobalUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove)
      window.removeEventListener('mouseup', handleGlobalUp)
      window.removeEventListener('touchmove', handleGlobalMove)
      window.removeEventListener('touchend', handleGlobalUp)
    }
  }, [draggedTokenId])

  // Custom Map Image Uploader
  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await uploadTacticalMap(formData)
      if (result.success && result.url) {
        setCustomMapUrl(result.url)
        setSelectedMapId('custom')
        
        if (!mapsList.find(m => m.id === 'custom')) {
          setMapsList(prev => [
            ...prev,
            { id: 'custom', name: 'แผนที่กิลด์ที่อัปโหลด', src: result.url!, fallbackBg: 'bg-slate-900', emoji: '🖼️' },
          ])
        } else {
          setMapsList(prev =>
            prev.map(m => (m.id === 'custom' ? { ...m, src: result.url! } : m))
          )
        }
        alert('อัปโหลดแผนที่กิลด์สำเร็จ!')
      } else {
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${result.error}`)
      }
    })
  }

  // Roster input handlers
  const handlePartyNameChange = (partyId: number, value: string) => {
    setParties(prev =>
      prev.map(p => (p.id === partyId ? { ...p, name: value } : p))
    )
    setTokens(prev =>
      prev.map(t => (t.id === partyId ? { ...t, name: value } : t))
    )
  }

  const handleMemberSlotChange = (partyId: number, slotIdx: number, value: string) => {
    setParties(prev =>
      prev.map(p => {
        if (p.id === partyId) {
          const newSlots = [...p.slots]
          newSlots[slotIdx] = value
          return { ...p, slots: newSlots }
        }
        return p
      })
    )
  }

  const handlePartyNoteChange = (partyId: number, value: string) => {
    setParties(prev =>
      prev.map(p => (p.id === partyId ? { ...p, notes: value } : p))
    )
  }

  // Toggle token visibility
  const toggleTokenVisibility = (tokenId: number) => {
    setTokens(prev =>
      prev.map(t => (t.id === tokenId ? { ...t, visible: t.visible === false ? true : false } : t))
    )
  }

  const isTokenVisible = (tokenId: number) => {
    const token = tokens.find(t => t.id === tokenId)
    return token?.visible !== false
  }

  // Save tactical plan
  const handleSavePlan = async () => {
    if (!planName.trim()) {
      alert('กรุณากรอกชื่อแผนการรบ')
      return
    }

    startTransition(async () => {
      const res = await saveTacticalPlan(
        selectedPlanId,
        planName,
        selectedMapId === 'custom' ? (customMapUrl || 'custom') : selectedMapId,
        battleNotes,
        tokens,
        drawings,
        parties
      )

      if (res.success && res.plan) {
        alert('บันทึกแผนการรบสำเร็จ!')
        if (!selectedPlanId) {
          setPlans(prev => [res.plan, ...prev])
          setSelectedPlanId(res.plan.id)
        } else {
          setPlans(prev => prev.map(p => (p.id === res.plan.id ? res.plan : p)))
        }
      } else {
        alert(`เกิดข้อผิดพลาดในการบันทึก: ${res.error}`)
      }
    })
  }

  // Load tactical plan
  const handleLoadPlan = (plan: any) => {
    setSelectedPlanId(plan.id)
    setPlanName(plan.plan_name)
    setBattleNotes(plan.battle_notes || '')
    setTokens(plan.token_positions || DEFAULT_TOKENS)
    setDrawings(plan.drawings || [])
    setParties(plan.parties_data || [])
    
    if (plan.map_name.startsWith('http') || plan.map_name === 'custom') {
      setCustomMapUrl(plan.map_name)
      setSelectedMapId('custom')
      if (!mapsList.find(m => m.id === 'custom')) {
        setMapsList(prev => [
          ...prev,
          { id: 'custom', name: 'แผนที่กิลด์ที่อัปโหลด', src: plan.map_name, fallbackBg: 'bg-slate-900', emoji: '🖼️' },
        ])
      }
    } else {
      setSelectedMapId(plan.map_name)
      setCustomMapUrl(null)
    }
  }

  // Delete tactical plan
  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแผนการรบนี้?')) return

    startTransition(async () => {
      const res = await deleteTacticalPlan(planId)
      if (res.success) {
        setPlans(prev => prev.filter(p => p.id !== planId))
        if (selectedPlanId === planId) {
          setSelectedPlanId(null)
          setPlanName('')
          setBattleNotes('')
          setDrawings([])
          setTokens(DEFAULT_TOKENS)
        }
        alert('ลบแผนการรบสำเร็จ!')
      } else {
        alert(`เกิดข้อผิดพลาดในการลบ: ${res.error}`)
      }
    })
  }

  // Export board to JPEG
  const handleExportImage = async () => {
    if (!exportRef.current) return
    setImageExporting(true)
    setImageError(null)

    try {
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.95,
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${planName || 'gvg-tactical-plan'}.jpg`
      link.click()
    } catch (err: any) {
      console.error('Export Tactical Board Error:', err)
      setImageError('เกิดข้อผิดพลาดในการแปลงไฟล์รูปภาพ กรุณาลองอีกครั้ง')
    } finally {
      setImageExporting(false)
    }
  }

  const handleResetPositions = () => {
    setTokens(DEFAULT_TOKENS.map(t => {
      const party = parties.find(p => p.id === t.id)
      return {
        ...t,
        name: party ? party.name : t.name
      }
    }))
  }

  return (
    <div 
      className="relative w-full text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex shadow-sm"
      style={{ height: '820px' }}
    >
      
      {/* ─── 👥 LEFT PANEL: Collapsible internally scrollable Parties Config ─── */}
      <div 
        className={`shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col transition-all duration-300 ${
          leftPanelOpen ? 'ml-0 opacity-100' : '-ml-80 opacity-0 pointer-events-none'
        }`}
        style={{ height: '100%' }}
      >
        {/* Fixed Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
            👥 จัดปาร์ตี้บอร์ดรบ (1-16)
          </h2>
          <button 
            onClick={() => setLeftPanelOpen(false)}
            className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300 text-xs cursor-pointer p-0.5"
            title="ซ่อนพาเนล"
          >
            ❌
          </button>
        </div>
        
        {/* Internally Scrollable Roster list */}
        <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-4">
          {parties.map(party => (
            <div key={party.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2 hover:border-slate-350 dark:hover:border-slate-700 transition-all shadow-xs">
              
              {/* Party Header & Name Input & Visibility Toggle */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                  <span 
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: DEFAULT_TOKENS[party.id - 1]?.color || '#38bdf8' }}
                  >
                    {DEFAULT_TOKENS[party.id - 1]?.emoji}
                  </span>
                  <input
                    type="text"
                    value={party.name}
                    onChange={(e) => handlePartyNameChange(party.id, e.target.value)}
                    placeholder={`Party ${party.id}`}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none border-b border-transparent hover:border-slate-350 dark:hover:border-slate-700 focus:border-indigo-500 w-full pb-0.5"
                  />
                </div>
                
                {/* Token visibility text toggle */}
                <button
                  onClick={() => toggleTokenVisibility(party.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                    isTokenVisible(party.id) 
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                      : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-400 dark:text-slate-550'
                  }`}
                  title={isTokenVisible(party.id) ? 'ซ่อนโทเค็นจากแผนที่' : 'แสดงโทเค็นบนแผนที่'}
                >
                  {isTokenVisible(party.id) ? 'แสดง' : 'ซ่อน'}
                </button>
              </div>

              {/* Party Member Slot Inputs */}
              <div className="space-y-1.5 pl-8">
                {party.slots.map((name: string, slotIdx: number) => (
                  <div key={slotIdx} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono w-2.5">{slotIdx + 1}.</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleMemberSlotChange(party.id, slotIdx, e.target.value)}
                      placeholder="ชื่อตัวละคร..."
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-300"
                    />
                  </div>
                ))}
              </div>

              {/* Mini notes for the party */}
              <div className="pl-8 pt-0.5">
                <textarea
                  value={party.notes}
                  onChange={(e) => handlePartyNoteChange(party.id, e.target.value)}
                  placeholder="เป้าหมาย/หมายเหตุ..."
                  rows={2}
                  className="w-full bg-slate-55/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] p-1.5 rounded focus:outline-none focus:border-indigo-500 resize-none text-slate-600 dark:text-slate-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 🛠️ CENTRAL AREA: Full-Width Full-Height Edge-to-Edge Canvas ─── */}
      <div 
        className="flex-1 h-full relative min-w-0 bg-slate-950 overflow-hidden"
        style={{ height: '100%' }}
      >
        
        {/* Floating Sidebar Open buttons (when collapsed) */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="absolute left-4 top-4 z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer text-slate-850 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            👥 แสดงปาร์ตี้
          </button>
        )}

        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="absolute right-4 top-4 z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer text-slate-850 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ⚙️ การตั้งค่าแผนรบ
          </button>
        )}

        {/* 🛠️ Floating Toolbar: Positioned absolute inside the canvas */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-lg transition-all">
          {/* Tool selector buttons */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
            <button
              onClick={() => setToolMode('select')}
              title="ย้ายตำแหน่งทีม"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🎯
            </button>
            <button
              onClick={() => setToolMode('draw')}
              title="วาดเส้นอิสระ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'draw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              ✏️
            </button>
            <button
              onClick={() => setToolMode('arrow')}
              title="ลากลูกศรชี้นำ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'arrow' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              ↗️
            </button>
            <button
              onClick={() => setToolMode('text')}
              title="เขียนป้ายข้อความ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🇹
            </button>
            <button
              onClick={() => setToolMode('erase')}
              title="ยางลบลบวัตถุ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'erase' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🧹
            </button>
          </div>

          {/* Color dots */}
          {toolMode !== 'select' && toolMode !== 'erase' && (
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setStrokeColor(color.value)}
                  style={{ backgroundColor: color.value }}
                  className={`w-4 h-4 rounded-full border border-slate-900 transition-all cursor-pointer ${strokeColor === color.value ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                />
              ))}
            </div>
          )}

          {/* Stroke thickness slider */}
          {toolMode !== 'select' && toolMode !== 'erase' && toolMode !== 'text' && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
              <input
                type="range"
                min="2"
                max="14"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-12 accent-indigo-500 h-0.5 bg-slate-800 rounded appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Clear button */}
          <button
            onClick={() => setDrawings([])}
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
            title="ล้างเส้นวาดทั้งหมด"
          >
            🗑️
          </button>
        </div>

        {/* ─── CAPTURED ELEMENT (Edge-to-edge layout filling entire middle space) ─── */}
        <div 
          ref={exportRef} 
          className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col justify-between"
        >
          
          {/* Interactive Workspace Container (Full width and height of parent, no aspect ratio constraints) */}
          <div className="relative w-full h-full rounded-none bg-slate-950 overflow-hidden shadow-none">
            
            {/* 1. Grid Blueprint Background (beautiful neon grid) */}
            <div className="absolute inset-0 bg-[#080d1a] z-0">
              <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-800/60 dark:text-slate-900/60" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* 2. Map Image Background (Stretched dynamically fitting viewport coordinate 1000x1000) */}
            {!mapError && (
              <img
                src={mapImageSrc}
                alt={selectedMapId}
                onError={() => setMapError(true)}
                className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none opacity-95 z-0"
              />
            )}

            {/* 3. Blueprint fallback text when map image fails to load */}
            {mapError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none z-0">
                <span className="text-5xl animate-pulse">{activeMap?.emoji || '🗺️'}</span>
                <span className="text-sm font-bold text-slate-400 mt-2">{activeMap?.name || 'ไม่มีภาพแผนที่'}</span>
                <span className="text-[10px] text-slate-500 max-w-xs text-center mt-1">กรุณาเพิ่มรูปภาพแผนที่ในโฟลเดอร์ public/maps</span>
              </div>
            )}

            {/* 4. Drawing and SVG overlay */}
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onTouchStart={handleSvgMouseDown}
              onTouchMove={handleSvgMouseMove}
              onTouchEnd={handleSvgMouseUp}
              className={`absolute inset-0 w-full h-full select-none z-10 ${toolMode === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            >
              {/* Dynamic arrowhead definitions per color */}
              <defs>
                {COLORS.map(color => (
                  <marker
                    key={color.value}
                    id={`arrow-${color.value.replace('#', '')}`}
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={color.value} />
                  </marker>
                ))}
              </defs>

              {/* Render Saved Drawings */}
              {drawings.map(d => {
                if (d.type === 'freehand') {
                  const dString = d.points
                    .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ')
                  return (
                    <path
                      key={d.id}
                      d={dString}
                      stroke={d.color}
                      strokeWidth={d.width}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      onClick={() => handleElementClick(d.id)}
                      className={toolMode === 'erase' ? 'hover:stroke-rose-600 cursor-pointer stroke-2' : ''}
                    />
                  )
                } else if (d.type === 'arrow') {
                  const colorKey = d.color.replace('#', '')
                  return (
                    <g key={d.id} onClick={() => handleElementClick(d.id)} className={toolMode === 'erase' ? 'hover:opacity-60 cursor-pointer' : ''}>
                      <line
                        x1={d.start.x}
                        y1={d.start.y}
                        x2={d.end.x}
                        y2={d.end.y}
                        stroke={d.color}
                        strokeWidth={d.width}
                        strokeLinecap="round"
                        markerEnd={`url(#arrow-${colorKey})`}
                      />
                    </g>
                  )
                } else if (d.type === 'text') {
                  return (
                    <text
                      key={d.id}
                      x={d.x}
                      y={d.y}
                      fill={d.color}
                      fontSize={26}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontWeight="bold"
                      onClick={() => handleElementClick(d.id)}
                      className={`select-none font-sans ${toolMode === 'erase' ? 'hover:fill-rose-600 cursor-pointer' : ''}`}
                    >
                      {d.text}
                    </text>
                  )
                }
                return null
              })}

              {/* Render Current Drawing Previews */}
              {currentPath && currentPath.length > 0 && (
                <path
                  d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {currentArrowStart && currentArrowEnd && (
                <line
                  x1={currentArrowStart.x}
                  y1={currentArrowStart.y}
                  x2={currentArrowEnd.x}
                  y2={currentArrowEnd.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  markerEnd={`url(#arrow-${strokeColor.replace('#', '')})`}
                />
              )}
            </svg>

            {/* 5. Interactive Floating Text Input Tool */}
            {textInput.visible && (
              <form
                onSubmit={handleTextSubmit}
                style={{
                  position: 'absolute',
                  left: `${textInput.x / 10}%`,
                  top: `${textInput.y / 10}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg flex items-center shadow-lg"
              >
                <input
                  type="text"
                  autoFocus
                  value={textInput.value}
                  onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="พิมพ์ข้อความ..."
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-2 py-1 rounded focus:outline-none w-28 text-slate-800 dark:text-slate-100"
                />
                <button type="submit" className="ml-1 bg-indigo-600 px-2 py-1 text-[10px] font-bold rounded hover:bg-indigo-500 text-white cursor-pointer">
                  ตกลง
                </button>
              </form>
            )}

            {/* 6. Draggable Tokens (Filtered by Visibility state, with hover tooltip) */}
            {tokens.filter(t => t.visible !== false).map(token => {
              const leftPercent = token.x / 10
              const topPercent = token.y / 10
              const isDragged = token.id === draggedTokenId

              return (
                <div
                  key={token.id}
                  onMouseDown={(e) => handleTokenStart(e, token.id)}
                  onTouchStart={(e) => handleTokenStart(e, token.id)}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                  }}
                  className={`z-20 select-none flex flex-col items-center group/token ${toolMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                >
                  {/* Glassmorphic Tooltip (Visible on Hover) */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover/token:opacity-100 transition-opacity duration-200 pointer-events-none bg-slate-950/95 dark:bg-slate-900/95 text-white border border-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
                    P{token.id}: {token.name}
                  </div>

                  <div 
                    style={{ borderColor: token.color, boxShadow: `0 0 12px ${token.color}80` }}
                    className={`w-10 h-10 rounded-full border-3 bg-white dark:bg-slate-900 flex items-center justify-center transition-all shadow-md relative ${isDragged ? 'scale-125 shadow-lg' : 'hover:scale-110 shadow-sm'}`}
                  >
                    <span className="text-xl">{token.emoji}</span>
                    <span 
                      style={{ backgroundColor: token.color }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white dark:border-slate-900"
                    >
                      {token.id}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ─── ⚙️ RIGHT PANEL: Collapsible internally scrollable Configuration ─── */}
      <div 
        className={`shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col transition-all duration-300 ${
          rightPanelOpen ? 'mr-0 opacity-100' : '-mr-80 opacity-0 pointer-events-none'
        }`}
        style={{ height: '100%' }}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
            ⚙️ ตั้งค่ายุทธวิธี & บันทึก
          </h2>
          <button 
            onClick={() => setRightPanelOpen(false)}
            className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300 text-xs cursor-pointer p-0.5"
            title="ซ่อนพาเนล"
          >
            ❌
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-4">
          
          {/* Battle notes */}
          <div className="space-y-1.5">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">🗒️ บันทึกคำสั่งยุทธวิธี</label>
            <textarea
              value={battleNotes}
              onChange={(e) => setBattleNotes(e.target.value)}
              placeholder="อธิบายยุทธวิธีในแผนรบนี้..."
              rows={4}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-2.5 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none shadow-xxs"
            />
          </div>

          {/* Map selection */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">🗺️ เลือกแผนที่สนามรบ</label>
            <select
              value={selectedMapId}
              onChange={(e) => {
                setSelectedMapId(e.target.value)
                if (e.target.value !== 'custom') setCustomMapUrl(null)
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-2.5 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer shadow-xxs"
            >
              {mapsList.map(map => (
                <option key={map.id} value={map.id}>
                  {map.emoji} {map.name}
                </option>
              ))}
            </select>

            {/* Map Uploader (Admin only) */}
            {isAdmin && (
              <div className="pt-1">
                <label className="cursor-pointer text-xxs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl transition-all shadow-xxs">
                  📤 อัปโหลดแผนที่กิลด์คัสตอม
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMapUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Admin reset controls */}
          {isAdmin && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
              <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">🛡️ แอดมินจัดการตำแหน่ง</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleResetPositions}
                  className="cursor-pointer text-xxs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-300 font-bold transition-all text-center shadow-xxs"
                >
                  รีเซ็ตโทเค็นทีม
                </button>
                <button
                  onClick={() => setDrawings([])}
                  className="cursor-pointer text-xxs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-350 font-bold transition-all text-center shadow-xxs"
                >
                  ล้างเส้นวาด
                </button>
              </div>
            </div>
          )}

          {/* Save & Export buttons */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">📸 ดาวน์โหลดแผนที่</label>
            <button
              onClick={handleExportImage}
              disabled={imageExporting}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm"
            >
              {imageExporting ? 'กำลังนำออก...' : '🖼️ Export ภาพแผนการรบ'}
            </button>
            {imageError && (
              <p className="text-xxs text-rose-500 font-semibold text-center">{imageError}</p>
            )}
          </div>

          {/* Plans Management */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">💾 เซฟและโหลดแผนการรบ</label>
            
            {/* Save input form (Admin only) */}
            {isAdmin && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="พิมพ์ชื่อแผน..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 flex-1 min-w-0 shadow-xxs"
                />
                <button
                  onClick={handleSavePlan}
                  disabled={isPending}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  บันทึก
                </button>
              </div>
            )}

            {/* List of saved plans */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {plans.length === 0 ? (
                <p className="text-[10px] text-slate-500 text-center py-2">ยังไม่มีแผนการรบในกิลด์</p>
              ) : (
                plans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => handleLoadPlan(plan)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-[10px] transition-all cursor-pointer ${selectedPlanId === plan.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 font-bold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750 shadow-xxs'}`}
                  >
                    <span className="truncate max-w-[150px] text-slate-750 dark:text-slate-200">{plan.plan_name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(plan.created_at).toLocaleDateString('th-TH')}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeletePlan(plan.id, e)}
                          title="ลบแผน"
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>

  </div>
)
}
