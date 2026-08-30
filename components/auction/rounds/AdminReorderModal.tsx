'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { bulkReorderRoundQueue } from '@/app/actions/auction-rounds'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import {
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Users,
  Shield,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Layers,
  Sword,
  Castle,
  ArrowDownAZ,
  RotateCcw,
  AlertCircle,
  Check
} from 'lucide-react'

type AdminReorderModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onOptimisticReorder?: (orderedIds: string[]) => void
  roundId?: string
  itemName?: ItemType
  roundNumber?: number
  members?: any[]
}

const getPartyColor = (partyId: number | null | undefined) => {
  if (!partyId) return null
  const colors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    2: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    3: { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    4: { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    5: { bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
    6: { bg: 'bg-cyan-50 dark:bg-cyan-950/50', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
    7: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
    8: { bg: 'bg-orange-50 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  }
  return colors[partyId] || {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  }
}

const getProfile = (member: any) => {
  if (!member) return {}
  if (Array.isArray(member.profiles)) return member.profiles[0] || {}
  return member.profiles || {}
}

export default function AdminReorderModal({
  isOpen,
  onClose,
  onSuccess,
  onOptimisticReorder,
  roundId,
  itemName,
  roundNumber = 1,
  members = [],
}: AdminReorderModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSortMode, setActiveSortMode] = useState<string>('custom')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Which party column to display as badge — changes with sort preset
  const [partySource, setPartySource] = useState<'general' | 'guild_league' | 'emperium_overrun'>('general')
  
  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 🛡️ Track open state to only initialize ONCE on open, preventing background SWR refreshes from wiping user's unsaved sort changes
  const prevIsOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (Array.isArray(members) && members.length > 0) {
        const sorted = [...members].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
        setItems(sorted)
      } else {
        setItems([])
      }
      setActiveSortMode('custom')
      setError(null)
      setSearchQuery('')
      setPartySource('general')
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, members])

  // Fallback: If modal opened while members was still loading, initialize when members arrives
  useEffect(() => {
    if (isOpen && items.length === 0 && Array.isArray(members) && members.length > 0) {
      const sorted = [...members].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
      setItems(sorted)
    }
  }, [isOpen, members, items.length])


  const initialOrderMap = useMemo(() => {
    const map = new Map<string, number>()
    if (Array.isArray(members)) {
      members.forEach((m, idx) => {
        if (m && m.id) {
          map.set(m.id, m.queue_order || idx + 1)
        }
      })
    }
    return map
  }, [members])

  const changedCount = useMemo(() => {
    return items.reduce((acc, m, idx) => {
      if (!m || !m.id) return acc
      const originalPos = initialOrderMap.get(m.id)
      return originalPos !== idx + 1 ? acc + 1 : acc
    }, 0)
  }, [items, initialOrderMap])

  // ⚠️ filteredIndices MUST be here (before early return) to obey React Rules of Hooks
  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase().trim()
    const set = new Set<number>()
    items.forEach((m, idx) => {
      const prof = getProfile(m)
      const name = (prof.display_name || '').toLowerCase()
      const uid = (prof.uid_game || '').toLowerCase()
      const party = String(prof.party_id || '')
      if (name.includes(q) || uid.includes(q) || party === q) {
        set.add(idx)
      }
    })
    return set
  }, [items, searchQuery])

  if (!isOpen || !mounted) return null

  const itemInfo = (itemName && ITEM_CONFIG[itemName]) ? ITEM_CONFIG[itemName] : { label: 'ไอเทม', color: 'from-blue-500 to-indigo-600' }

  // --- Helper: resolve party info based on active source ---
  const getActivePartyId = (profile: any): number | null => {
    if (partySource === 'guild_league') return profile.party_id_guild_league ?? null
    if (partySource === 'emperium_overrun') return profile.party_id_emperium_overrun ?? null
    return profile.party_id ?? null
  }

  const getActiveSlotIndex = (profile: any): number | null => {
    if (partySource === 'guild_league') return profile.slot_index_guild_league ?? null
    if (partySource === 'emperium_overrun') return profile.slot_index_emperium_overrun ?? null
    return profile.slot_index ?? null
  }

  // คำนวณหา base quota มาตรฐานของรอบ (โควตาฐานปกติ เช่น 1)
  const standardBaseQuota = useMemo(() => {
    if (!items || items.length === 0) return 1
    const minQuota = Math.min(...items.map(m => Number(m.base_quota) || 1))
    return minQuota
  }, [items])

  // ตรวจสอบว่าสมาชิกคนนี้เป็นผู้ได้รับสิทธิ์ทบยอดจากรอบก่อนหน้าหรือไม่ (Priority Rollover Member)
  const isPriorityMember = (member: any): boolean => {
    if (!member) return false
    return (Number(member.base_quota) || 1) > standardBaseQuota
  }

  // Helper สำหรับจัดเรียงโดยล็อกสิทธิ์ทบยอด (Priority Members) ให้อยู่ด้านบนสุดเสมอ
  const sortWithPriorityPinned = (comparator: (a: any, b: any) => number) => {
    const priorityMembers = items
      .filter(m => isPriorityMember(m))
      .sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0))

    const regularMembers = items
      .filter(m => !isPriorityMember(m))
      .sort(comparator)

    return [...priorityMembers, ...regularMembers]
  }

  // --- Sort Helper Presets ---
  const handleSortByPartyGeneral = () => {
    const sorted = sortWithPriorityPinned((a, b) => {
      const profA = getProfile(a)
      const profB = getProfile(b)
      const pA = profA.party_id ?? 9999
      const pB = profB.party_id ?? 9999
      if (pA !== pB) return pA - pB

      const slotA = profA.slot_index ?? 9999
      const slotB = profB.slot_index ?? 9999
      if (slotA !== slotB) return slotA - slotB

      const nameA = profA.display_name || ''
      const nameB = profB.display_name || ''
      return nameA.localeCompare(nameB, 'th', { numeric: true })
    })
    setItems(sorted)
    setActiveSortMode('party_general')
    setPartySource('general')
  }

  const handleSortByGuildLeague = () => {
    const sorted = sortWithPriorityPinned((a, b) => {
      const profA = getProfile(a)
      const profB = getProfile(b)
      const pA = profA.party_id_guild_league ?? 9999
      const pB = profB.party_id_guild_league ?? 9999
      if (pA !== pB) return pA - pB

      const slotA = profA.slot_index_guild_league ?? 9999
      const slotB = profB.slot_index_guild_league ?? 9999
      if (slotA !== slotB) return slotA - slotB

      const nameA = profA.display_name || ''
      const nameB = profB.display_name || ''
      return nameA.localeCompare(nameB, 'th', { numeric: true })
    })
    setItems(sorted)
    setActiveSortMode('party_guild_league')
    setPartySource('guild_league')
  }

  const handleSortByEmperium = () => {
    const sorted = sortWithPriorityPinned((a, b) => {
      const profA = getProfile(a)
      const profB = getProfile(b)
      const pA = profA.party_id_emperium_overrun ?? 9999
      const pB = profB.party_id_emperium_overrun ?? 9999
      if (pA !== pB) return pA - pB

      const slotA = profA.slot_index_emperium_overrun ?? 9999
      const slotB = profB.slot_index_emperium_overrun ?? 9999
      if (slotA !== slotB) return slotA - slotB

      const nameA = profA.display_name || ''
      const nameB = profB.display_name || ''
      return nameA.localeCompare(nameB, 'th', { numeric: true })
    })
    setItems(sorted)
    setActiveSortMode('party_emperium')
    setPartySource('emperium_overrun')
  }

  const handleSortAlphabetical = () => {
    const sorted = sortWithPriorityPinned((a, b) => {
      const profA = getProfile(a)
      const profB = getProfile(b)
      const nameA = profA.display_name || ''
      const nameB = profB.display_name || ''
      return nameA.localeCompare(nameB, 'th', { numeric: true })
    })
    setItems(sorted)
    setActiveSortMode('alphabetical')
  }

  const handleReset = () => {
    if (Array.isArray(members)) {
      const sorted = [...members].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
      setItems(sorted)
    }
    setActiveSortMode('custom')
  }

  // --- Step Manual Moves ---
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return
    const copy = [...items]
    const [moved] = copy.splice(fromIdx, 1)
    copy.splice(toIdx, 0, moved)
    setItems(copy)
    setActiveSortMode('custom')
  }

  // --- Drag and Drop Handlers ---
  const onDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const onDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    moveItem(draggedIndex, index)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const onDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // --- Save Changes ---
  const handleSave = async () => {
    if (!roundId) {
      setError('ไม่พบรหัสรอบการประมูล กรุณาลองใหม่อีกครั้ง')
      return
    }

    if (changedCount === 0) {
      onClose()
      return
    }

    const orderedIds = items.map(m => m?.id).filter(Boolean)
    
    // ⚡ Instant Optimistic Update (0ms): ปรับ state ที่หน้าหลักทันทีและปิด Modal ทันใจ
    onOptimisticReorder?.(orderedIds)
    onClose()

    let sortLabel = 'จัดเรียงตำแหน่งใหม่'
    if (activeSortMode === 'party_general') sortLabel = 'จัดเรียงตามปาร์ตี้ทั่วไป'
    else if (activeSortMode === 'party_guild_league') sortLabel = 'จัดเรียงตามปาร์ตี้ Guild League'
    else if (activeSortMode === 'party_emperium') sortLabel = 'จัดเรียงตามปาร์ตี้ Emperium Overrun'
    else if (activeSortMode === 'alphabetical') sortLabel = 'จัดเรียงตามตัวอักษร'

    // บันทึกลงฐานข้อมูลแบบ Background
    try {
      const res = await bulkReorderRoundQueue(roundId, orderedIds, `${sortLabel} (เปลี่ยน ${changedCount} ตำแหน่ง)`)
      if (res.success) {
        onSuccess()
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกลำดับคิว: ' + (res.error || 'Unknown error'))
      }
    } catch (err: any) {
      console.error('bulkReorderRoundQueue error:', err)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.message || 'Network error'))
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-purple-50/60 via-slate-50/40 to-indigo-50/60 dark:from-slate-800/60 dark:to-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  รอบที่ {roundNumber} • {itemInfo.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({items.length} สมาชิก)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                จัดลำดับคิวประมูล (Reorder & Party Sort)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar / Presets */}
        <div className="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles size={12} className="text-amber-500" /> จัดเรียงด่วน:
            </span>

            <button
              type="button"
              onClick={handleSortByPartyGeneral}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeSortMode === 'party_general'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ทั่วไป (ทีมหลัก)"
            >
              <Users size={13} /> {activeSortMode === 'party_general' && <Check size={12} className="stroke-[3]" />} ตามปาร์ตี้ทั่วไป
            </button>

            <button
              type="button"
              onClick={handleSortByGuildLeague}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeSortMode === 'party_guild_league'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ Guild League"
            >
              <Sword size={13} /> {activeSortMode === 'party_guild_league' && <Check size={12} className="stroke-[3]" />} Guild League
            </button>

            <button
              type="button"
              onClick={handleSortByEmperium}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeSortMode === 'party_emperium'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ Emperium Overrun"
            >
              <Castle size={13} /> {activeSortMode === 'party_emperium' && <Check size={12} className="stroke-[3]" />} Emperium
            </button>

            <button
              type="button"
              onClick={handleSortAlphabetical}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeSortMode === 'alphabetical'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-400/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงตามตัวอักษร ก-ฮ / A-Z"
            >
              <ArrowDownAZ size={13} /> {activeSortMode === 'alphabetical' && <Check size={12} className="stroke-[3]" />} ตัวอักษร
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              title="คืนค่าเป็นลำดับเดิมจากฐานข้อมูล"
            >
              <RotateCcw size={12} /> รีเซ็ต
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ / ปาร์ตี้..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Tip & Status Banner */}
        <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">แหล่งข้อมูลปาร์ตี้ที่แสดง:</span>
            {partySource === 'guild_league' && (
              <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Sword size={11} /> ปาร์ตี้ Guild League
              </span>
            )}
            {partySource === 'emperium_overrun' && (
              <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Castle size={11} /> ปาร์ตี้ Emperium Overrun
              </span>
            )}
            {partySource === 'general' && (
              <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Users size={11} /> ปาร์ตี้ทั่วไป (ทีมหลัก)
              </span>
            )}
          </div>
          {changedCount > 0 ? (
            <span className="font-bold font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full text-[10px]">
              มีการปรับ {changedCount} ตำแหน่ง (ยังไม่บันทึก)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">
              ✓ ลำดับตรงกับฐานข้อมูลปัจจุบัน
            </span>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Member Reorder List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-1.5 min-h-[250px]">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">ไม่พบสมาชิกในรอบนี้</p>
            </div>
          ) : (
            items.map((member, index) => {
              if (!member) return null
              const profile = getProfile(member)
              const partyId = getActivePartyId(profile)
              const slotIdx = getActiveSlotIndex(profile)
              const partyColor = getPartyColor(partyId)
              const isMatch = filteredIndices ? filteredIndices.has(index) : true
              const isDragging = draggedIndex === index
              const isOver = dragOverIndex === index && draggedIndex !== index
              const baseQuota = Number(member.base_quota) || 0
              const transferredIn = Number(member.transferred_in_quota) || 0
              const transferredOut = Number(member.transferred_out_quota) || 0
              const target = baseQuota + transferredIn - transferredOut
              const received = Number(member.received_qty) || 0

              return (
                <div
                  key={member.id || `member-row-${index}`}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={() => onDrop(index)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition select-none ${
                    isDragging
                      ? 'opacity-40 bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 scale-[0.99]'
                      : isOver
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-950/30 ring-2 ring-purple-400/40'
                      : isMatch
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      : 'opacity-30 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Left: Drag handle + Index + Name + Party */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing rounded shrink-0"
                      title="ลากเพื่อสลับตำแหน่ง"
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* Real-time Queue Badge */}
                    <span className="w-7 text-center font-mono font-black text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                      #{index + 1}
                    </span>

                    {/* Name & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {profile.display_name || 'ไม่ระบุชื่อ'}
                        {profile.role === 'admin' && (
                          <Shield size={12} className="text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {profile.uid_game ? `UID: ${profile.uid_game}` : 'ไม่มี UID'}
                      </div>
                    </div>

                    {/* Party & Priority Tags */}
                    <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                      {isPriorityMember(member) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0 shadow-2xs">
                          ⚡ สิทธิ์ทบยอด ({member.base_quota} ชิ้น)
                        </span>
                      )}
                      {partyColor ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${partyColor.bg} ${partyColor.text} ${partyColor.border}`}>
                          <Users size={10} /> ปาร์ตี้ {partyId} {slotIdx !== null && slotIdx !== undefined ? `(Slot ${slotIdx + 1})` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          ไม่มีปาร์ตี้
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quota + Action Step Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="text-right hidden sm:block pr-2">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                        {received}/{target}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 0)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded"
                        title="ย้ายไปบนสุด"
                      >
                        <ChevronsUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded"
                        title="เลื่อนขึ้น 1 ตำแหน่ง"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === items.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded"
                        title="เลื่อนลง 1 ตำแหน่ง"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, items.length - 1)}
                        disabled={index === items.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded"
                        title="ย้ายไปล่างสุด"
                      >
                        <ChevronsDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {changedCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                * มีการเปลี่ยนแปลง {changedCount} รายการที่ยังไม่ได้บันทึก
              </span>
            ) : (
              <span>ลำดับยังตรงกับฐานข้อมูลปัจจุบัน</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || changedCount === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={13} /> บันทึกลำดับคิว
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
