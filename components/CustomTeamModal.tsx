'use client'

import { useState, useEffect } from 'react'
import { CustomTeamGroup, TeamColorTheme } from '@/types/database'
import { TEAM_COLOR_MAP } from './PartyBlock'

interface CustomTeamModalProps {
  isOpen: boolean
  onClose: () => void
  customGroups: CustomTeamGroup[]
  onSaveGroups: (groups: CustomTeamGroup[]) => void
  planTitle: string
  onSavePlanTitle: (title: string) => void
  planSubtitle: string
  onSavePlanSubtitle: (subtitle: string) => void
}

const PRESET_EMOJIS = [
  '🏰', '🔥', '⚡', '🛡️', '⚔️', '🎯', '👑', '🌲', 
  '🏹', '🧙', '🌟', '🚩', '🦅', '🐉', '💥', '💣', '💎', '⚓'
]

const COLOR_OPTIONS: { theme: TeamColorTheme; label: string; bgClass: string }[] = [
  { theme: 'blue', label: 'น้ำเงิน (Blue)', bgClass: 'bg-blue-500' },
  { theme: 'rose', label: 'ชมพู/แดง (Rose)', bgClass: 'bg-rose-500' },
  { theme: 'amber', label: 'ส้ม/ทอง (Amber)', bgClass: 'bg-amber-500' },
  { theme: 'emerald', label: 'เขียว (Emerald)', bgClass: 'bg-emerald-500' },
  { theme: 'purple', label: 'ม่วง (Purple)', bgClass: 'bg-purple-500' },
  { theme: 'indigo', label: 'คราม (Indigo)', bgClass: 'bg-indigo-500' },
  { theme: 'cyan', label: 'ฟ้า (Cyan)', bgClass: 'bg-cyan-500' },
  { theme: 'slate', label: 'เทา (Slate)', bgClass: 'bg-slate-500' },
]

export const DEFAULT_CUSTOM_GROUPS: CustomTeamGroup[] = [
  {
    id: 'defense',
    name: 'ทีมป้องกันบ้าน',
    icon: '🏰',
    colorTheme: 'blue',
    partyIds: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'offense',
    name: 'ทีมบุก',
    icon: '🔥',
    colorTheme: 'rose',
    partyIds: [7, 8, 9, 10, 11, 12],
  },
  {
    id: 'runner',
    name: 'ทีมวิ่งบ้าน',
    icon: '⚡',
    colorTheme: 'amber',
    partyIds: [13, 14, 15, 16],
  },
]

export default function CustomTeamModal({
  isOpen,
  onClose,
  customGroups,
  onSaveGroups,
  planTitle,
  onSavePlanTitle,
  planSubtitle,
  onSavePlanSubtitle,
}: CustomTeamModalProps) {
  const [localTitle, setLocalTitle] = useState(planTitle)
  const [localSubtitle, setLocalSubtitle] = useState(planSubtitle)
  const [localGroups, setLocalGroups] = useState<CustomTeamGroup[]>(customGroups)
  const [activeEmojiPickerIndex, setActiveEmojiPickerIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLocalTitle(planTitle || 'แผนจัดทีม Emperium Overrun')
      setLocalSubtitle(planSubtitle || 'แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
      setLocalGroups(
        customGroups && customGroups.length > 0
          ? JSON.parse(JSON.stringify(customGroups))
          : JSON.parse(JSON.stringify(DEFAULT_CUSTOM_GROUPS))
      )
      setActiveEmojiPickerIndex(null)
    }
  }, [isOpen, planTitle, planSubtitle, customGroups])

  if (!isOpen) return null

  const handleGroupNameChange = (index: number, name: string) => {
    setLocalGroups(prev => {
      const next = [...prev]
      next[index] = { ...next[index], name }
      return next
    })
  }

  const handleGroupIconChange = (index: number, icon: string) => {
    setLocalGroups(prev => {
      const next = [...prev]
      next[index] = { ...next[index], icon }
      return next
    })
    setActiveEmojiPickerIndex(null)
  }

  const handleGroupColorChange = (index: number, colorTheme: TeamColorTheme) => {
    setLocalGroups(prev => {
      const next = [...prev]
      next[index] = { ...next[index], colorTheme }
      return next
    })
  }

  const handleAddGroup = () => {
    if (localGroups.length >= 8) {
      alert('สามารถเพิ่มกลุ่มทีมได้สูงสุด 8 กลุ่มครับ')
      return
    }

    const availableColors: TeamColorTheme[] = ['emerald', 'purple', 'indigo', 'cyan', 'slate', 'blue', 'rose', 'amber']
    const nextColor = availableColors[localGroups.length % availableColors.length]
    const nextNum = localGroups.length + 1

    const newGroup: CustomTeamGroup = {
      id: `group_${Date.now()}_${nextNum}`,
      name: `ทีมกลุ่มที่ ${nextNum}`,
      icon: '🚩',
      colorTheme: nextColor,
      partyIds: [],
    }

    setLocalGroups(prev => [...prev, newGroup])
  }

  const handleDeleteGroup = (index: number) => {
    if (localGroups.length <= 1) {
      alert('ต้องมีกลุ่มทีมอย่างน้อย 1 กลุ่มครับ')
      return
    }

    const groupToDelete = localGroups[index]
    const remainingParties = groupToDelete.partyIds || []

    setLocalGroups(prev => {
      const filtered = prev.filter((_, idx) => idx !== index)
      // Transfer unassigned parties to the first remaining group
      if (filtered.length > 0 && remainingParties.length > 0) {
        const firstGroupParties = new Set([...filtered[0].partyIds, ...remainingParties])
        filtered[0] = {
          ...filtered[0],
          partyIds: Array.from(firstGroupParties).sort((a, b) => a - b),
        }
      }
      return filtered
    })
  }

  const handleToggleParty = (groupIndex: number, partyId: number) => {
    setLocalGroups(prev => {
      return prev.map((g, idx) => {
        if (idx === groupIndex) {
          // If already in this group, toggle off (if not alone in group)
          const exists = g.partyIds.includes(partyId)
          if (exists) {
            return { ...g, partyIds: g.partyIds.filter(id => id !== partyId) }
          } else {
            return { ...g, partyIds: [...g.partyIds, partyId].sort((a, b) => a - b) }
          }
        } else {
          // Remove from any other group
          return { ...g, partyIds: g.partyIds.filter(id => id !== partyId) }
        }
      })
    })
  }

  const handleResetToDefault = () => {
    if (confirm('คุณต้องการคืนค่ากลุ่มทีมและคำอธิบายเป็นค่าเริ่มต้นหรือไม่?')) {
      setLocalTitle('แผนจัดทีม Emperium Overrun')
      setLocalSubtitle('แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
      setLocalGroups(JSON.parse(JSON.stringify(DEFAULT_CUSTOM_GROUPS)))
    }
  }

  const handleSave = () => {
    // Ensure all 16 parties are assigned to at least one group
    const allAssigned = new Set<number>()
    localGroups.forEach(g => g.partyIds.forEach(id => allAssigned.add(id)))

    const unassigned: number[] = []
    for (let p = 1; p <= 16; p++) {
      if (!allAssigned.has(p)) unassigned.push(p)
    }

    let finalGroups = [...localGroups]
    if (unassigned.length > 0 && finalGroups.length > 0) {
      // Put unassigned parties into the first group
      finalGroups[0] = {
        ...finalGroups[0],
        partyIds: [...finalGroups[0].partyIds, ...unassigned].sort((a, b) => a - b),
      }
    }

    onSavePlanTitle(localTitle.trim() || 'แผนจัดทีมประจำกิจกรรม')
    onSavePlanSubtitle(localSubtitle.trim() || 'แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม')
    onSaveGroups(finalGroups)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden my-auto border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                ปรับแต่งกลุ่มทีม & แผนจัดทัพ (Custom Teams)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                กำหนดชื่อทีม อิโมจิ สี และจัดสรรปาร์ตี้ได้อย่างอิสระตามกลยุทธ์กิลด์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          
          {/* Section 1: Plan Title & Subtitle */}
          <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
              <span>📝</span> หัวข้อและคำอธิบายแผนจัดทัพ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  ชื่อแผนกิจกรรม (Header Title)
                </label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="เช่น แผนจัดทีม Emperium Overrun"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  คำบรรยายใต้หัวข้อ (Subtitle / Note)
                </label>
                <input
                  type="text"
                  value={localSubtitle}
                  onChange={(e) => setLocalSubtitle(e.target.value)}
                  placeholder="เช่น แผนจัดทัพกำลังพลกิลด์ประจำกิจกรรม"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Team Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                <span>👥</span> รายการกลุ่มทีม ({localGroups.length} ทีม)
              </h3>
              <button
                type="button"
                onClick={handleAddGroup}
                className="cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
              >
                <span>➕</span> เพิ่มทีมใหม่
              </button>
            </div>

            <div className="space-y-3">
              {localGroups.map((group, groupIndex) => {
                const colorMeta = TEAM_COLOR_MAP[group.colorTheme] || TEAM_COLOR_MAP.blue

                return (
                  <div
                    key={group.id || groupIndex}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm space-y-3 transition-all relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Emoji & Name & Delete */}
                      <div className="flex items-center gap-2 flex-1">
                        {/* Emoji Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveEmojiPickerIndex(
                                activeEmojiPickerIndex === groupIndex ? null : groupIndex
                              )
                            }
                            className="cursor-pointer text-xl w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 transition-colors"
                            title="คลิกเพื่อเปลี่ยน Emoji"
                          >
                            {group.icon || '🚩'}
                          </button>

                          {/* Emoji Picker Popover */}
                          {activeEmojiPickerIndex === groupIndex && (
                            <div className="absolute left-0 top-12 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 shadow-xl grid grid-cols-6 gap-1 w-56">
                              {PRESET_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleGroupIconChange(groupIndex, emoji)}
                                  className="cursor-pointer text-lg p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Name Input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => handleGroupNameChange(groupIndex, e.target.value)}
                            placeholder="ชื่อทีม เช่น ทีมบุกหลัก, ป้อมบน"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Color Theme Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">สีธีม:</span>
                        <div className="flex items-center gap-1">
                          {COLOR_OPTIONS.map((c) => (
                            <button
                              key={c.theme}
                              type="button"
                              onClick={() => handleGroupColorChange(groupIndex, c.theme)}
                              className={`w-5 h-5 rounded-full ${c.bgClass} transition-transform ${
                                group.colorTheme === c.theme
                                  ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-850 scale-110'
                                  : 'opacity-60 hover:opacity-100 hover:scale-105'
                              }`}
                              title={c.label}
                            />
                          ))}
                        </div>

                        {/* Delete Button */}
                        {localGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(groupIndex)}
                            className="cursor-pointer ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="ลบกลุ่มทีมนี้"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Party Allocation Selector */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          ปาร์ตี้ที่จัดสรรให้อยู่ในทีมนี้ ({group.partyIds.length} ปาร์ตี้):
                        </span>
                        <span className={`text-[10px] font-bold ${colorMeta.text} ${colorMeta.darkText}`}>
                          {group.partyIds.length === 0 ? 'ยังไม่ได้เลือกปาร์ตี้' : `Party: ${group.partyIds.join(', ')}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: 16 }, (_, i) => i + 1).map((partyId) => {
                          const isAssignedToThis = group.partyIds.includes(partyId)
                          const assignedGroup = localGroups.find(
                            (g, gIdx) => gIdx !== groupIndex && g.partyIds.includes(partyId)
                          )

                          return (
                            <button
                              key={partyId}
                              type="button"
                              onClick={() => handleToggleParty(groupIndex, partyId)}
                              className={`cursor-pointer px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                isAssignedToThis
                                  ? `${colorMeta.bgBadge} ${colorMeta.text} ${colorMeta.darkText} border ${colorMeta.borderBadge} shadow-xs`
                                  : assignedGroup
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-transparent hover:border-gray-300'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                              }`}
                              title={
                                isAssignedToThis
                                  ? `คลิกเพื่อนำ Party ${partyId} ออกจากทีมนี้`
                                  : assignedGroup
                                  ? `Party ${partyId} อยู่ใน ${assignedGroup.name} (คลิกเพื่อย้ายมาทีมนี้)`
                                  : `คลิกเพื่อเพิ่ม Party ${partyId} ในทีมนี้`
                              }
                            >
                              P{partyId}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
          >
            🔄 รีเซ็ตเป็นค่าเริ่มต้น
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5"
            >
              <span>💾</span> บันทึกการตั้งค่า
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
