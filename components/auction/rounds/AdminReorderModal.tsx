'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  bulkReorderRoundQueue,
  getGuildQueueTemplates,
  createQueueTemplate,
} from '@/app/actions/auction-rounds'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import AdminQueueTemplateModal from './AdminQueueTemplateModal'
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
  ArrowDownAZ,
  RotateCcw,
  AlertCircle,
  Check,
  CheckCircle2,
  Settings,
  Plus,
  Info
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
  guildMembers?: any[]
}

const getProfile = (member: any, guildMembersMap?: Map<string, any>) => {
  if (!member) return {}
  const p = Array.isArray(member.profiles)
    ? member.profiles[0] || {}
    : member.profiles || member.profile || {}

  const uId = member.user_id || member.id || p.id
  const gm = (uId && guildMembersMap ? guildMembersMap.get(uId) : null) || {}

  return {
    display_name: p.display_name || member.display_name || gm.display_name || 'ไม่ระบุชื่อ',
    uid_game: p.uid_game || member.uid_game || gm.uid_game || '',
    role: p.role || member.role || gm.role || 'member',
    avatar_url: p.avatar_url || member.avatar_url || gm.avatar_url || null,
    party_id: p.party_id ?? member.party_id ?? gm.party_id ?? null,
    slot_index: p.slot_index ?? member.slot_index ?? gm.slot_index ?? null,
  }
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
  guildMembers = [],
}: AdminReorderModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 🗺️ Guild members map for rock-solid UID resolution
  const guildMembersMap = useMemo(() => {
    const map = new Map<string, any>()
    ;(guildMembers || []).forEach((g: any) => {
      if (g && (g.id || g.user_id)) {
        if (g.id) map.set(g.id, g)
        if (g.user_id) map.set(g.user_id, g)
      }
    })
    return map
  }, [guildMembers])

  // กรองแยกสมาชิกที่ "ได้รับครบแล้ว" (Completed) ออกจากสมาชิกที่ "กำลังรอรับ" (Pending)
  const { pendingMembers, completedMembers } = useMemo(() => {
    const pending: any[] = []
    const completed: any[] = []
    ;(members || []).forEach(m => {
      if (!m) return
      const target = (Number(m.base_quota) || 0) + (Number(m.transferred_in_quota) || 0) - (Number(m.transferred_out_quota) || 0)
      const isDone = m.status === 'completed' || (target > 0 && (Number(m.received_qty) || 0) >= target)
      if (isDone) {
        completed.push(m)
      } else {
        pending.push(m)
      }
    })
    return { pendingMembers: pending, completedMembers: completed }
  }, [members])

  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSortMode, setActiveSortMode] = useState<string>('custom')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Custom Templates states
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateNotice, setTemplateNotice] = useState<string | null>(null)

  // Drag and Drop & Auto-scroll states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ targetIndex: number; position: 'before' | 'after' } | null>(null)
  const [autoScrollDir, setAutoScrollDir] = useState<'up' | 'down' | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const autoScrollRef = useRef<{
    rafId: number | null
    speed: number
    dir: 'up' | 'down' | null
  }>({ rafId: null, speed: 0, dir: null })

  // 🛡️ Track open state to only initialize ONCE on open
  const prevIsOpenRef = useRef(false)

  const loadTemplates = async () => {
    try {
      const res = await getGuildQueueTemplates()
      if (res.success && res.templates) {
        setTemplates(res.templates)
      }
    } catch (err) {
      console.error('loadTemplates error:', err)
    }
  }

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (Array.isArray(pendingMembers) && pendingMembers.length > 0) {
        const sorted = [...pendingMembers].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
        setItems(sorted)
      } else {
        setItems([])
      }
      setActiveSortMode('custom')
      setError(null)
      setSearchQuery('')
      setTemplateNotice(null)
      setSelectedTemplateId('')
      loadTemplates()
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, pendingMembers])

  // Fallback: If modal opened while pendingMembers was still loading
  useEffect(() => {
    if (isOpen && items.length === 0 && Array.isArray(pendingMembers) && pendingMembers.length > 0) {
      const sorted = [...pendingMembers].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
      setItems(sorted)
    }
  }, [isOpen, pendingMembers, items.length])

  const initialOrderMap = useMemo(() => {
    const map = new Map<string, number>()
    if (Array.isArray(pendingMembers)) {
      pendingMembers.forEach((m, idx) => {
        if (m && m.id) {
          map.set(m.id, m.queue_order || idx + 1)
        }
      })
    }
    return map
  }, [pendingMembers])

  const changedCount = useMemo(() => {
    return items.reduce((acc, m, idx) => {
      if (!m || !m.id) return acc
      const originalPos = initialOrderMap.get(m.id)
      return originalPos !== idx + 1 ? acc + 1 : acc
    }, 0)
  }, [items, initialOrderMap])

  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase().trim()
    const set = new Set<number>()
    items.forEach((m, idx) => {
      const prof = getProfile(m)
      const name = (prof.display_name || '').toLowerCase()
      const uid = (prof.uid_game || '').toLowerCase()
      if (name.includes(q) || uid.includes(q)) {
        set.add(idx)
      }
    })
    return set
  }, [items, searchQuery])

  // คำนวณหา base quota มาตรฐานของรอบ (โควตาฐานปกติ เช่น 1)
  const standardBaseQuota = useMemo(() => {
    if (!items || items.length === 0) return 1
    const quotas = items.map(m => Number(m.base_quota) || 1)
    return quotas.length > 0 ? Math.min(...quotas) : 1
  }, [items])

  const itemInfo = (itemName && ITEM_CONFIG[itemName]) ? ITEM_CONFIG[itemName] : { label: 'ไอเทม', color: 'from-blue-500 to-indigo-600' }

  // ตรวจสอบว่าสมาชิกคนนี้เป็นผู้ได้รับสิทธิ์ทบยอดจากรอบก่อนหน้าหรือไม่ (Priority Rollover Member)
  const isPriorityMember = (member: any): boolean => {
    if (!member) return false
    return (Number(member.base_quota) || 1) > standardBaseQuota
  }

  // จัดเรียงตามตัวอักษร
  const handleSortAlphabetical = () => {
    const priorityMembers = items
      .filter(m => isPriorityMember(m))
      .sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0))

    const regularMembers = items
      .filter(m => !isPriorityMember(m))
      .sort((a, b) => {
        const nameA = getProfile(a).display_name || ''
        const nameB = getProfile(b).display_name || ''
        return nameA.localeCompare(nameB, 'th', { numeric: true })
      })

    setItems([...priorityMembers, ...regularMembers])
    setActiveSortMode('alphabetical')
  }

  // รีเซ็ตกลับเป็นลำดับเดิม
  const handleReset = () => {
    if (Array.isArray(pendingMembers)) {
      const sorted = [...pendingMembers].sort((a, b) => (a?.queue_order || 0) - (b?.queue_order || 0))
      setItems(sorted)
    }
    setActiveSortMode('custom')
    setSelectedTemplateId('')
    setTemplateNotice(null)
  }

  // นำเทมเพลตที่เลือกมาจัดเรียงคิว (พร้อม Logic ข้ามคนที่ได้ของครบแล้วในรอบนี้)
  const handleApplyTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId)
    if (!tmplId) return

    const targetTmpl = templates.find(t => t.id === tmplId)
    if (!targetTmpl) return

    const tmplUserIds: string[] = Array.isArray(targetTmpl.member_ids) ? targetTmpl.member_ids : []
    const pendingMap = new Map<string, any>()
    items.forEach(m => {
      const uId = m.user_id || m.profiles?.id
      if (uId) pendingMap.set(uId, m)
    })

    const newOrdered: any[] = []
    const placedIds = new Set<string>()
    const skippedCompletedNames: string[] = []

    // 1. นำสมาชิกตามเทมเพลตมาจัดวาง
    for (const uId of tmplUserIds) {
      // ตรวจสอบว่าคนนี้ได้รับของครบแล้วในรอบนี้หรือไม่?
      const completedMatch = completedMembers.find(cm => (cm.user_id || cm.profiles?.id) === uId)
      if (completedMatch) {
        // ข้ามทันที! ไม่สามารถจัดคิวซ้ำได้
        const name = getProfile(completedMatch).display_name || 'สมาชิก'
        skippedCompletedNames.push(name)
        continue
      }

      // ตรวจสอบว่าเป็นสมาชิกที่กำลังรอรับของในรอบนี้
      const pendingMatch = pendingMap.get(uId)
      if (pendingMatch && !placedIds.has(pendingMatch.id)) {
        newOrdered.push(pendingMatch)
        placedIds.add(pendingMatch.id)
      }
    }

    // 2. สมาชิกในรอบที่รอรับอยู่ แต่ไม่ได้อยู่ในเทมเพลต ให้นำมาต่อท้ายตามลำดับเดิม
    items.forEach(m => {
      if (!placedIds.has(m.id)) {
        newOrdered.push(m)
        placedIds.add(m.id)
      }
    })

    setItems(newOrdered)
    setActiveSortMode(`template_${targetTmpl.id}`)

    if (skippedCompletedNames.length > 0) {
      setTemplateNotice(
        `นำเทมเพลต "${targetTmpl.name}" มาใช้จัดคิวแล้ว (ข้าม ${skippedCompletedNames.length} คนที่ได้ของครบในรอบนี้: ${skippedCompletedNames.slice(0, 3).join(', ')}${skippedCompletedNames.length > 3 ? '...' : ''})`
      )
    } else {
      setTemplateNotice(`นำเทมเพลต "${targetTmpl.name}" มาใช้จัดเรียงคิวเรียบร้อย`)
    }
  }

  // เซฟลำดับคิวปัจจุบันเป็นเทมเพลตใหม่
  const handleSaveAsNewTemplate = async () => {
    const defaultName = `เทมเพลตคิว ${templates.length + 1}`
    const name = prompt('กรุณาตั้งชื่อเทมเพลตใหม่:', defaultName)
    if (!name || !name.trim()) return

    const memberIds = items.map(m => m.user_id || m.profiles?.id).filter(Boolean)
    try {
      const res = await createQueueTemplate(name.trim(), `สร้างจากคิวรอบประมูล ${itemInfo.label || ''}`, memberIds)
      if (res.success && res.template) {
        setTemplates(prev => [res.template, ...prev])
        setSelectedTemplateId(res.template.id)
        setTemplateNotice(`บันทึกเป็นเทมเพลตใหม่ "${res.template.name}" เรียบร้อยแล้ว`)
      } else {
        alert(res.error || 'ไม่สามารถบันทึกเทมเพลตได้')
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  // Step Manual Moves
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return
    const copy = [...items]
    const [moved] = copy.splice(fromIdx, 1)
    copy.splice(toIdx, 0, moved)
    setItems(copy)
    setActiveSortMode('custom')
  }

  // Auto-scroll controller for dragging near top/bottom edges
  const stopAutoScroll = () => {
    if (autoScrollRef.current.rafId !== null) {
      cancelAnimationFrame(autoScrollRef.current.rafId)
      autoScrollRef.current.rafId = null
    }
    autoScrollRef.current.speed = 0
    autoScrollRef.current.dir = null
    setAutoScrollDir(null)
  }

  const startAutoScroll = (speed: number, dir: 'up' | 'down') => {
    autoScrollRef.current.speed = speed
    if (autoScrollRef.current.dir !== dir) {
      autoScrollRef.current.dir = dir
      setAutoScrollDir(dir)
    }

    if (autoScrollRef.current.rafId !== null) return

    const step = () => {
      if (!scrollContainerRef.current || autoScrollRef.current.speed === 0) {
        autoScrollRef.current.rafId = null
        autoScrollRef.current.dir = null
        setAutoScrollDir(null)
        return
      }
      scrollContainerRef.current.scrollTop += autoScrollRef.current.speed
      autoScrollRef.current.rafId = requestAnimationFrame(step)
    }

    autoScrollRef.current.rafId = requestAnimationFrame(step)
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!scrollContainerRef.current || draggedIndex === null) return

    const container = scrollContainerRef.current
    const rect = container.getBoundingClientRect()
    const threshold = 75 // 75px threshold from edge

    const topDist = e.clientY - rect.top
    const bottomDist = rect.bottom - e.clientY

    if (topDist >= 0 && topDist < threshold) {
      const factor = (threshold - topDist) / threshold
      const speed = -Math.round(4 + factor * 16)
      startAutoScroll(speed, 'up')
    } else if (bottomDist >= 0 && bottomDist < threshold) {
      const factor = (threshold - bottomDist) / threshold
      const speed = Math.round(4 + factor * 16)
      startAutoScroll(speed, 'down')
    } else {
      stopAutoScroll()
    }
  }

  const cleanupDrag = () => {
    stopAutoScroll()
    setDraggedIndex(null)
    setDropTarget(null)
  }

  useEffect(() => {
    return () => {
      stopAutoScroll()
    }
  }, [])

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', String(index))
    } catch {}
  }

  const isNoOp = (targetIndex: number, position: 'before' | 'after') => {
    if (draggedIndex === null) return true
    if (targetIndex === draggedIndex) return true
    if (targetIndex === draggedIndex - 1 && position === 'after') return true
    if (targetIndex === draggedIndex + 1 && position === 'before') return true
    return false
  }

  const onItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    handleContainerDragOver(e)

    if (draggedIndex === null) return

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'

    if (isNoOp(index, position)) {
      if (dropTarget !== null) setDropTarget(null)
      return
    }

    if (!dropTarget || dropTarget.targetIndex !== index || dropTarget.position !== position) {
      setDropTarget({ targetIndex: index, position })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (draggedIndex === null || dropTarget === null) {
      cleanupDrag()
      return
    }

    const { targetIndex, position } = dropTarget
    if (isNoOp(targetIndex, position)) {
      cleanupDrag()
      return
    }

    let insertAt = position === 'before' ? targetIndex : targetIndex + 1
    const copy = [...items]
    const [moved] = copy.splice(draggedIndex, 1)

    if (draggedIndex < insertAt) {
      insertAt -= 1
    }

    copy.splice(insertAt, 0, moved)
    setItems(copy)
    setActiveSortMode('custom')
    cleanupDrag()
  }

  const onDragEnd = () => {
    cleanupDrag()
  }

  const previewRank = useMemo(() => {
    if (draggedIndex === null || dropTarget === null) return null
    const { targetIndex, position } = dropTarget
    const rawTarget = position === 'before' ? targetIndex : targetIndex + 1
    return draggedIndex < rawTarget ? rawTarget : rawTarget + 1
  }, [draggedIndex, dropTarget])

  const draggedMemberProfile = useMemo(() => {
    if (draggedIndex === null || !items[draggedIndex]) return null
    return getProfile(items[draggedIndex], guildMembersMap)
  }, [draggedIndex, items, guildMembersMap])

  const draggedMemberName = useMemo(() => {
    return draggedMemberProfile?.display_name || 'สมาชิก'
  }, [draggedMemberProfile])


  // Save Changes
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
    
    // ⚡ Instant Optimistic Update (0ms)
    onOptimisticReorder?.(orderedIds)
    onClose()

    let sortLabel = 'จัดเรียงลำดับคิวใหม่'
    if (activeSortMode.startsWith('template_')) {
      const tmpl = templates.find(t => `template_${t.id}` === activeSortMode)
      if (tmpl) sortLabel = `จัดตามเทมเพลต "${tmpl.name}"`
    } else if (activeSortMode === 'alphabetical') {
      sortLabel = 'จัดเรียงตามตัวอักษร'
    }

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

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
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
                  (รอรับ {items.length} สมาชิก)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                จัดลำดับคิวประมูล (Queue Templates & Reorder)
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

        {/* Action Toolbar: Custom Templates & Controls (No party buttons) */}
        <div className="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            
            {/* Template Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 px-2 py-1 rounded-xl border border-purple-200 dark:border-purple-800/80">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Layers size={13} /> ใช้เทมเพลต:
              </span>
              <select
                value={selectedTemplateId}
                onChange={e => handleApplyTemplate(e.target.value)}
                className="bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 py-1 px-2.5 rounded-lg border border-purple-200 dark:border-purple-700/80 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="">-- เลือกเทมเพลตจัดคิว --</option>
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    📋 {tmpl.name} ({Array.isArray(tmpl.member_ids) ? tmpl.member_ids.length : 0} คน)
                  </option>
                ))}
              </select>
            </div>

            {/* Manage Templates Button */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="เปิดหน้าต่างจัดการ สร้าง แก้ไข หรือลบเทมเพลตคิว"
            >
              <Settings size={13} className="text-purple-500" /> จัดการเทมเพลต
            </button>

            {/* Quick Save as New Template */}
            <button
              type="button"
              onClick={handleSaveAsNewTemplate}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="เซฟลำดับคิวในหน้านี้เป็นเทมเพลตใหม่"
            >
              <Plus size={13} className="text-indigo-500" /> เซฟเป็นเทมเพลตใหม่
            </button>

            {/* Alphabetical Sort */}
            <button
              type="button"
              onClick={handleSortAlphabetical}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                activeSortMode === 'alphabetical'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-xs ring-1 ring-slate-400'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="จัดเรียงตามตัวอักษร ก-ฮ / A-Z"
            >
              <ArrowDownAZ size={13} /> {activeSortMode === 'alphabetical' && <Check size={11} className="stroke-[3]" />} ตัวอักษร
            </button>

            {/* Reset */}
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
          <div className="relative w-full sm:w-44">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ / UID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Informative Banners: Completed Members Exclusion Notice & Template Notice */}
        {completedMembers.length > 0 && (
          <div className="px-4 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-200/80 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold text-[11px]">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              มีสมาชิกประมูลได้รับของครบในรอบนี้แล้ว {completedMembers.length} คน (ถูกล็อกและข้ามการจัดคิวอัตโนมัติ ไม่สามารถจัดคิวซ้ำได้)
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              แสดงเฉพาะคนที่รอรับ {items.length} คน
            </span>
          </div>
        )}

        {templateNotice && (
          <div className="px-4 py-2 bg-purple-50/80 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2 text-xs text-purple-800 dark:text-purple-300 animate-in fade-in duration-150">
            <span className="flex items-center gap-1.5 font-bold text-[11px]">
              <Sparkles size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
              {templateNotice}
            </span>
            <button
              onClick={() => setTemplateNotice(null)}
              className="text-purple-400 hover:text-purple-700 dark:hover:text-purple-200"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Unsaved Changes Banner */}
        <div className="px-4 py-1.5 bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 font-medium">
            คิวประมูลในรอบ (เรียงจากบนลงล่าง):
          </span>
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
        <div
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDrop={handleDrop}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              stopAutoScroll()
            }
          }}
          className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-1.5 min-h-[250px] relative scroll-smooth select-none"
        >
          {/* Floating Auto-scroll Indicators when dragging near top/bottom */}
          {autoScrollDir === 'up' && (
            <div className="sticky top-0 z-30 py-1.5 px-3 bg-purple-600/90 text-white text-[11px] font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 backdrop-blur-xs animate-pulse mb-1">
              <ChevronsUp size={14} className="animate-bounce" /> กำลังเลื่อนขึ้นอัตโนมัติ...
            </div>
          )}

          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold">ไม่มีสมาชิกที่กำลังรอรับของในรอบนี้</p>
              {completedMembers.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-bold">
                  สมาชิกทุกคนได้รับไอเทมครบตามโควตาของรอบแล้ว 🎉
                </p>
              )}
            </div>
          ) : (
            items.map((member, index) => {
              if (!member) return null
              const profile = getProfile(member, guildMembersMap)
              const isMatch = filteredIndices ? filteredIndices.has(index) : true
              const isDragging = draggedIndex === index
              const baseQuota = Number(member.base_quota) || 0
              const transferredIn = Number(member.transferred_in_quota) || 0
              const transferredOut = Number(member.transferred_out_quota) || 0
              const target = baseQuota + transferredIn - transferredOut
              const received = Number(member.received_qty) || 0
              const remaining = Math.max(0, target - received)

              const isDropTargetBefore = dropTarget?.targetIndex === index && dropTarget.position === 'before'
              const isDropTargetAfter = dropTarget?.targetIndex === index && dropTarget.position === 'after'

              return (
                <div
                  key={member.id || `member-row-${index}`}
                  onDragOver={(e) => onItemDragOver(e, index)}
                  onDrop={handleDrop}
                  className="transition-all"
                >
                  {/* 🌟 Animated Drop Slot Preview (BEFORE) */}
                  {isDropTargetBefore && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleContainerDragOver(e)
                      }}
                      onDrop={handleDrop}
                      className="py-2.5 px-3.5 my-1.5 rounded-2xl border-2 border-dashed border-purple-500 dark:border-purple-400 bg-purple-50/95 dark:bg-purple-950/70 shadow-lg shadow-purple-500/10 flex items-center justify-between gap-2 animate-in zoom-in-95 fade-in duration-150 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 text-center font-mono font-black text-xs text-white bg-linear-to-r from-purple-600 to-indigo-600 py-0.5 rounded shadow-xs shrink-0 animate-pulse">
                          #{previewRank}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 truncate">
                          <span className="shrink-0 flex items-center gap-1">
                            <Sparkles size={13} className="text-purple-500" /> แทรกตรงนี้ ➔
                          </span>
                          <span className="text-purple-950 dark:text-purple-100 font-black underline decoration-purple-400 underline-offset-2 truncate">
                            {draggedMemberName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-purple-900/80 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-700/80 shrink-0 shadow-2xs">
                        ปล่อยเพื่อจัดคิว #{previewRank}
                      </span>
                    </div>
                  )}

                  {/* Member Card */}
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onItemDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={onDragEnd}
                    className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition-all select-none ${
                      isDragging
                        ? 'opacity-35 bg-purple-50/60 dark:bg-purple-950/20 border-2 border-dashed border-purple-400 dark:border-purple-600 scale-[0.98]'
                        : isMatch
                        ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
                        : 'opacity-30 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Left: Drag handle + Index + Name */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing rounded shrink-0 transition"
                        title="ลากเพื่อสลับตำแหน่งคิว"
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
                          {isDragging && (
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0 animate-pulse">
                              กำลังย้าย...
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
                          {profile.party_id ? (
                            <span>ปาร์ตี้ {profile.party_id} {profile.slot_index ? `(ช่อง ${profile.slot_index})` : ''}</span>
                          ) : (
                            <span>ไม่มีปาร์ตี้</span>
                          )}
                        </div>
                      </div>

                      {/* Priority Rollover Tags */}
                      {isPriorityMember(member) && (
                        <div className="shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0 shadow-2xs">
                            ⚡ สิทธิ์ทบยอด ({member.base_quota} ชิ้น)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Quota + Action Step Buttons */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <div className="text-right hidden sm:block pr-2">
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {received}/{target} ชิ้น
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          รอรับอีก {remaining} ชิ้น
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => moveItem(index, 0)}
                          disabled={index === 0}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded cursor-pointer"
                          title="ย้ายไปบนสุด"
                        >
                          <ChevronsUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, index - 1)}
                          disabled={index === 0}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded cursor-pointer"
                          title="เลื่อนขึ้น 1 ตำแหน่ง"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, index + 1)}
                          disabled={index === items.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded cursor-pointer"
                          title="เลื่อนลง 1 ตำแหน่ง"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, items.length - 1)}
                          disabled={index === items.length - 1}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition rounded cursor-pointer"
                          title="ย้ายไปล่างสุด"
                        >
                          <ChevronsDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 🌟 Animated Drop Slot Preview (AFTER) */}
                  {isDropTargetAfter && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleContainerDragOver(e)
                      }}
                      onDrop={handleDrop}
                      className="py-2.5 px-3.5 my-1.5 rounded-2xl border-2 border-dashed border-purple-500 dark:border-purple-400 bg-purple-50/95 dark:bg-purple-950/70 shadow-lg shadow-purple-500/10 flex items-center justify-between gap-2 animate-in zoom-in-95 fade-in duration-150 transition-all cursor-pointer pointer-events-auto"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 text-center font-mono font-black text-xs text-white bg-linear-to-r from-purple-600 to-indigo-600 py-0.5 rounded shadow-xs shrink-0 animate-pulse">
                          #{previewRank}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 truncate">
                          <span className="shrink-0 flex items-center gap-1">
                            <Sparkles size={13} className="text-purple-500" /> แทรกตรงนี้ ➔
                          </span>
                          <span className="text-purple-950 dark:text-purple-100 font-black underline decoration-purple-400 underline-offset-2 truncate">
                            {draggedMemberName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-purple-900/80 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-700/80 shrink-0 shadow-2xs">
                        ปล่อยเพื่อจัดคิว #{previewRank}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Floating Auto-scroll Indicators when dragging near bottom */}
          {autoScrollDir === 'down' && (
            <div className="sticky bottom-0 z-30 py-1.5 px-3 bg-purple-600/90 text-white text-[11px] font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 backdrop-blur-xs animate-pulse mt-1">
              <ChevronsDown size={14} className="animate-bounce" /> กำลังเลื่อนลงอัตโนมัติ...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {changedCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                * มีการเปลี่ยนแปลง {changedCount} ตำแหน่งที่ยังไม่ได้บันทึก
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

      {/* Embedded AdminQueueTemplateModal for managing templates */}
      {isTemplateModalOpen && (
        <AdminQueueTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => {
            setIsTemplateModalOpen(false)
            loadTemplates()
          }}
          guildMembers={guildMembers.length > 0 ? guildMembers : members.map(m => getProfile(m)).filter(Boolean)}
          onTemplatesUpdated={loadTemplates}
        />
      )}
    </div>
  )

  return createPortal(modalContent, document.body)
}
