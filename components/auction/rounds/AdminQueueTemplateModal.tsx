'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  getGuildQueueTemplates,
  createQueueTemplate,
  updateQueueTemplate,
  deleteQueueTemplate
} from '@/app/actions/auction-rounds'
import {
  X,
  Plus,
  Trash2,
  Save,
  Search,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Users,
  Layers,
  Sparkles,
  AlertCircle,
  Check,
  Edit3,
  Loader2
} from 'lucide-react'

type AdminQueueTemplateModalProps = {
  isOpen: boolean
  onClose: () => void
  guildMembers: any[]
  onTemplatesUpdated?: () => void
  initialSelectedTemplateId?: string
}

export default function AdminQueueTemplateModal({
  isOpen,
  onClose,
  guildMembers = [],
  onTemplatesUpdated,
  initialSelectedTemplateId,
}: AdminQueueTemplateModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form states for currently selected template
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [orderedMemberIds, setOrderedMemberIds] = useState<string[]>([])

  // Member search states for adding members to template
  const [searchMemberQuery, setSearchMemberQuery] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // Drag and Drop state within template members
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Fetch templates on open
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getGuildQueueTemplates()
      if (res.success && res.templates) {
        setTemplates(res.templates)
        if (res.templates.length > 0) {
          const targetId = initialSelectedTemplateId && res.templates.some((t: any) => t.id === initialSelectedTemplateId)
            ? initialSelectedTemplateId
            : res.templates[0].id
          selectTemplate(targetId, res.templates)
        } else {
          startNewTemplate()
        }
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลเทมเพลตได้')
    } finally {
      setIsLoading(false)
    }
  }

  const selectTemplate = (id: string, list = templates) => {
    const target = list.find((t: any) => t.id === id)
    if (target) {
      setSelectedTemplateId(target.id)
      setTemplateName(target.name)
      setTemplateDescription(target.description || '')
      setOrderedMemberIds(Array.isArray(target.member_ids) ? target.member_ids : [])
      setIsCreatingNew(false)
      setError(null)
      setSuccessMessage(null)
    }
  }

  const startNewTemplate = () => {
    setSelectedTemplateId(null)
    setTemplateName(`เทมเพลตจัดคิว ${templates.length + 1}`)
    setTemplateDescription('')
    setOrderedMemberIds([])
    setIsCreatingNew(true)
    setError(null)
    setSuccessMessage(null)
  }

  // Guild Members quick lookup Map
  const membersMap = useMemo(() => {
    const map = new Map<string, any>()
    guildMembers.forEach((m: any) => {
      if (m && m.id) map.set(m.id, m)
    })
    return map
  }, [guildMembers])

  // Members currently in the template
  const templateMembers = useMemo(() => {
    return orderedMemberIds
      .map(id => membersMap.get(id))
      .filter(Boolean)
  }, [orderedMemberIds, membersMap])

  // Available guild members NOT yet in the template
  const availableMembers = useMemo(() => {
    const currentSet = new Set(orderedMemberIds)
    const filtered = guildMembers.filter((m: any) => m && m.id && !currentSet.has(m.id))

    if (!searchMemberQuery.trim()) return filtered
    const q = searchMemberQuery.toLowerCase().trim()
    return filtered.filter((m: any) => {
      const name = (m.display_name || '').toLowerCase()
      const uid = (m.uid_game || '').toLowerCase()
      return name.includes(q) || uid.includes(q)
    })
  }, [guildMembers, orderedMemberIds, searchMemberQuery])

  // Add member to template
  const handleAddMember = (memberId: string) => {
    if (!orderedMemberIds.includes(memberId)) {
      setOrderedMemberIds(prev => [...prev, memberId])
    }
  }

  // Add all available members
  const handleAddAllAvailable = () => {
    const idsToAdd = availableMembers.map((m: any) => m.id)
    setOrderedMemberIds(prev => [...prev, ...idsToAdd])
  }

  // Remove member from template
  const handleRemoveMember = (memberId: string) => {
    setOrderedMemberIds(prev => prev.filter(id => id !== memberId))
  }

  // Reorder functions
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= orderedMemberIds.length) return
    const copy = [...orderedMemberIds]
    const [moved] = copy.splice(fromIdx, 1)
    copy.splice(toIdx, 0, moved)
    setOrderedMemberIds(copy)
  }

  // Drag & drop handlers
  const onDragStart = (index: number) => setDraggedIndex(index)
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragOverIndex !== index) setDragOverIndex(index)
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

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('กรุณาระบุชื่อเทมเพลต')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isCreatingNew || !selectedTemplateId) {
        const res = await createQueueTemplate(templateName, templateDescription, orderedMemberIds)
        if (res.success && res.template) {
          setSuccessMessage('สร้างเทมเพลตใหม่สำเร็จ')
          setTemplates(prev => [res.template, ...prev])
          setSelectedTemplateId(res.template.id)
          setIsCreatingNew(false)
          onTemplatesUpdated?.()
        } else {
          setError(res.error || 'ไม่สามารถสร้างเทมเพลตได้')
        }
      } else {
        const res = await updateQueueTemplate(selectedTemplateId, templateName, templateDescription, orderedMemberIds)
        if (res.success && res.template) {
          setSuccessMessage('บันทึกการแก้ไขเทมเพลตสำเร็จ')
          setTemplates(prev => prev.map((t: any) => t.id === res.template.id ? res.template : t))
          onTemplatesUpdated?.()
        } else {
          setError(res.error || 'ไม่สามารถบันทึกเทมเพลตได้')
        }
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setIsSaving(false)
    }
  }

  // Delete template
  const handleDelete = async (templateId: string, name: string) => {
    if (!confirm(`ยืนยันการลบเทมเพลต "${name}"?`)) return

    try {
      const res = await deleteQueueTemplate(templateId)
      if (res.success) {
        const remaining = templates.filter((t: any) => t.id !== templateId)
        setTemplates(remaining)
        onTemplatesUpdated?.()
        if (remaining.length > 0) {
          selectTemplate(remaining[0].id, remaining)
        } else {
          startNewTemplate()
        }
      } else {
        alert(res.error || 'ไม่สามารถลบเทมเพลตได้')
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ')
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-purple-50/70 via-slate-50/40 to-indigo-50/70 dark:from-slate-800/80 dark:to-slate-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  Custom Queue Templates
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  (ระบบเทมเพลตคิวอิสระของหัวกิลด์)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
                จัดการเทมเพลตคิวประมูล
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Two-Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Template List */}
          <div className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                เทมเพลตทั้งหมด ({templates.length})
              </span>
              <button
                type="button"
                onClick={startNewTemplate}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus size={13} /> สร้างใหม่
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {isLoading ? (
                <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-purple-500" />
                  <span>กำลังโหลดเทมเพลต...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  ยังไม่มีเทมเพลต กดสร้างใหม่เพื่อเริ่มต้น
                </div>
              ) : (
                templates.map((tmpl: any) => {
                  const isSelected = tmpl.id === selectedTemplateId && !isCreatingNew
                  const count = Array.isArray(tmpl.member_ids) ? tmpl.member_ids.length : 0

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => selectTemplate(tmpl.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-purple-500 dark:border-purple-500 shadow-sm ring-1 ring-purple-500/20'
                          : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-750 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {tmpl.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                          <Users size={10} /> {count} สมาชิก
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(tmpl.id, tmpl.name)
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title="ลบเทมเพลตนี้"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Template Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            
            {/* Top Form: Template Info */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 shrink-0">ชื่อเทมเพลต:</span>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="เช่น คิวทีมวอร์ A, คิวฟาร์มรอบ 1"
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {orderedMemberIds.length} สมาชิกในคิว
                  </span>
                </div>
              </div>

              {/* Status Notifications */}
              {error && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle size={14} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                  <Check size={14} className="shrink-0 text-green-500" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            {/* Middle Section: Template Members + Add Member Panel */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* Left Side: Ordered Members in Template (Draggable) */}
              <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers size={13} className="text-purple-500" />
                    ลำดับคิวในเทมเพลต (ลากสลับคิวได้)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    หัวกิลด์จัดลำดับ 1, 2, 3 ได้ตามต้องการ
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {orderedMemberIds.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-bold">ยังไม่มีสมาชิกในเทมเพลตนี้</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        เลือกเพิ่มสมาชิกจากตารางด้านขวาได้เลยครับ
                      </p>
                    </div>
                  ) : (
                    templateMembers.map((member: any, index: number) => {
                      const isDragging = draggedIndex === index
                      const isOver = dragOverIndex === index && draggedIndex !== index

                      return (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={() => onDragStart(index)}
                          onDragOver={(e) => onDragOver(e, index)}
                          onDrop={() => onDrop(index)}
                          onDragEnd={onDragEnd}
                          className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition select-none ${
                            isDragging
                              ? 'opacity-40 bg-purple-50 dark:bg-purple-950/40 border-purple-400'
                              : isOver
                              ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-400/40'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="p-1 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing rounded shrink-0">
                              <GripVertical size={14} />
                            </div>

                            <span className="w-6 text-center font-mono font-black text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
                              #{index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {member.display_name || 'ไม่ระบุชื่อ'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {member.uid_game ? `UID: ${member.uid_game}` : 'ไม่มี UID'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Move Up / Down Buttons */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => moveItem(index, index - 1)}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 transition rounded"
                                title="เลื่อนขึ้น"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(index, index + 1)}
                                disabled={index === orderedMemberIds.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 transition rounded"
                                title="เลื่อนลง"
                              >
                                <ChevronDown size={13} />
                              </button>
                            </div>

                            {/* Remove from template button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                              title="ลบออกจากเทมเพลต"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Side: Available Guild Members to Add */}
              <div className="w-full lg:w-72 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      สมาชิกกิลด์ที่ยังไม่ใส่ ({availableMembers.length})
                    </span>
                    {availableMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllAvailable}
                        className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                      >
                        + เพิ่มทั้งหมด
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อหรือ UID..."
                      value={searchMemberQuery}
                      onChange={e => setSearchMemberQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {availableMembers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      สมาชิกทุกคนอยู่ในเทมเพลตนี้แล้ว
                    </div>
                  ) : (
                    availableMembers.map((member: any) => (
                      <div
                        key={member.id}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 hover:border-purple-300 dark:hover:border-purple-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {member.display_name || 'ไม่ระบุชื่อ'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {member.uid_game ? `UID: ${member.uid_game}` : 'ไม่มี UID'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddMember(member.id)}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus size={12} /> ใส่คิว
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Footer: Save Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400">
                * เทมเพลตนี้เป็นข้อมูลอิสระ ไม่กระทบผังปาร์ตี้ของกิลด์
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save size={14} /> บันทึกเทมเพลต
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
