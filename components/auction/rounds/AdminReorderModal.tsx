'use client'

import { useState, useEffect, useMemo } from 'react'
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
  AlertCircle
} from 'lucide-react'

type AdminReorderModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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
  roundId,
  itemName,
  roundNumber = 1,
  members = [],
}: AdminReorderModalProps) {
  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSortMode, setActiveSortMode] = useState<string>('custom')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Initialize items when modal opens or members change
  useEffect(() => {
    if (isOpen) {
      if (Array.isArray(members) && members.length > 0) {
        const sorted = [...members].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
        setItems(sorted)
      } else {
        setItems([])
      }
      setActiveSortMode('custom')
      setError(null)
      setSearchQuery('')
    }
  }, [isOpen, members])

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

  if (!isOpen) return null

  const itemInfo = (itemName && ITEM_CONFIG[itemName]) ? ITEM_CONFIG[itemName] : { label: 'ไอเทม', color: 'from-blue-500 to-indigo-600' }

  // --- Sort Helper Presets ---
  const handleSortByPartyGeneral = () => {
    const sorted = [...items].sort((a, b) => {
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
      return nameA.localeCompare(nameB, 'th')
    })
    setItems(sorted)
    setActiveSortMode('party_general')
  }

  const handleSortByGuildLeague = () => {
    const sorted = [...items].sort((a, b) => {
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
      return nameA.localeCompare(nameB, 'th')
    })
    setItems(sorted)
    setActiveSortMode('party_guild_league')
  }

  const handleSortByEmperium = () => {
    const sorted = [...items].sort((a, b) => {
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
      return nameA.localeCompare(nameB, 'th')
    })
    setItems(sorted)
    setActiveSortMode('party_emperium')
  }

  const handleSortAlphabetical = () => {
    const sorted = [...items].sort((a, b) => {
      const profA = getProfile(a)
      const profB = getProfile(b)
      const nameA = profA.display_name || ''
      const nameB = profB.display_name || ''
      return nameA.localeCompare(nameB, 'th')
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

    setIsSaving(true)
    setError(null)

    try {
      let sortLabel = 'จัดเรียงตำแหน่งใหม่'
      if (activeSortMode === 'party_general') sortLabel = 'จัดเรียงตามปาร์ตี้ทั่วไป'
      else if (activeSortMode === 'party_guild_league') sortLabel = 'จัดเรียงตามปาร์ตี้ Guild League'
      else if (activeSortMode === 'party_emperium') sortLabel = 'จัดเรียงตามปาร์ตี้ Emperium Overrun'
      else if (activeSortMode === 'alphabetical') sortLabel = 'จัดเรียงตามตัวอักษร'

      const orderedIds = items.map(m => m?.id).filter(Boolean)
      const res = await bulkReorderRoundQueue(roundId, orderedIds, `${sortLabel} (เปลี่ยน ${changedCount} ตำแหน่ง)`)

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกลำดับคิว')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSaving(false)
    }
  }



  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeSortMode === 'party_general'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ทั่วไป (Party 1, 2, ...)"
            >
              <Users size={13} /> ตามปาร์ตี้ทั่วไป
            </button>

            <button
              type="button"
              onClick={handleSortByGuildLeague}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeSortMode === 'party_guild_league'
                  ? 'bg-indigo-500 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ Guild League"
            >
              <Sword size={13} /> Guild League
            </button>

            <button
              type="button"
              onClick={handleSortByEmperium}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeSortMode === 'party_emperium'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงกลุ่มสมาชิกตามปาร์ตี้ Emperium Overrun"
            >
              <Castle size={13} /> Emperium
            </button>

            <button
              type="button"
              onClick={handleSortAlphabetical}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeSortMode === 'alphabetical'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงตามตัวอักษร A-Z"
            >
              <ArrowDownAZ size={13} /> ตัวอักษร
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
              title="คืนค่าเป็นลำดับเดิม"
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
        <div className="px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-[11px] text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-1.5">
            <GripVertical size={13} className="shrink-0 text-blue-500" />
            <span>สามารถคลิกลากที่ไอคอน <span className="font-bold">⋮⋮</span> เพื่อสลับตำแหน่ง หรือกดปุ่มลูกศรขึ้น-ลง ได้เลย</span>
          </div>
          {changedCount > 0 && (
            <span className="font-bold font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full text-[10px]">
              มีการปรับ {changedCount} ตำแหน่ง
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
            <div className="text-center py-12 text-slate-400 text-sm">
              ยังไม่มีรายชื่อสมาชิกในรอบนี้
            </div>
          ) : (
            items.map((member, index) => {
              if (!member) return null
              const profile = getProfile(member)
              const partyId = profile.party_id
              const slotIdx = profile.slot_index
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

                    {/* Party Tag */}
                    <div className="shrink-0 flex items-center gap-1">
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

                    <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => moveItem(index, 0)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-purple-600 disabled:opacity-20 disabled:hover:text-slate-500 transition cursor-pointer"
                        title="ขึ้นบนสุด"
                      >
                        <ChevronsUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-purple-600 disabled:opacity-20 disabled:hover:text-slate-500 transition cursor-pointer"
                        title="เลื่อนขึ้น 1 ตำแหน่ง"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={index === items.length - 1}
                        className="p-1 text-slate-500 hover:text-purple-600 disabled:opacity-20 disabled:hover:text-slate-500 transition cursor-pointer"
                        title="เลื่อนลง 1 ตำแหน่ง"
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, items.length - 1)}
                        disabled={index === items.length - 1}
                        className="p-1 text-slate-500 hover:text-purple-600 disabled:opacity-20 disabled:hover:text-slate-500 transition cursor-pointer"
                        title="ลงล่างสุด"
                      >
                        <ChevronsDown size={13} />
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
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
}
