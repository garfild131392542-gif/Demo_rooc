'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { manualAwardRoundMember } from '@/app/actions/auction-rounds'
import { CheckCircle2, Clock, ArrowRightLeft, UserX, ArrowUpDown, History, ShieldCheck, Search, Award, Plus, X, AlertCircle } from 'lucide-react'

type RoundMemberTabsProps = {
  members: any[]
  logs: any[]
  isAdmin: boolean
  activeItem: ItemType
  roundNumber: number
  onSwapOrder: (member: any) => void
  onSkipMember: (member: any) => void
  onTransferForMember: (member: any) => void
  onRefreshData?: () => void
  isLoading?: boolean
}

export default function RoundMemberTabs({
  members,
  logs,
  isAdmin,
  activeItem,
  roundNumber,
  onSwapOrder,
  onSkipMember,
  onTransferForMember,
  onRefreshData,
  isLoading,
}: RoundMemberTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'logs'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [awardQty, setAwardQty] = useState(1)
  const [awardNote, setAwardNote] = useState('')
  const [isAwarding, setIsAwarding] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)

  const itemInfo = ITEM_CONFIG[activeItem]

  // Filter members
  const completedMembers = members.filter(m => {
    const target = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
    return m.status === 'completed' || (m.received_qty >= target && target > 0)
  })

  const pendingMembers = members.filter(m => {
    const target = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
    return m.status !== 'completed' && !(m.received_qty >= target && target > 0)
  })

  // 🌟 Selectable members for Direct Award (Excludes anyone who is completed!)
  const selectablePendingMembers = pendingMembers.filter(m => {
    const target = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
    return target > m.received_qty && m.status !== 'completed' && m.status !== 'transferred'
  })

  const filterBySearch = (list: any[]) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(m => {
      const name = m.profiles?.display_name?.toLowerCase() || ''
      const uid = m.profiles?.uid_game?.toLowerCase() || ''
      return name.includes(q) || uid.includes(q)
    })
  }

  const filteredPending = filterBySearch(pendingMembers)
  const filteredCompleted = filterBySearch(completedMembers)

  const handleOpenAwardModal = (member?: any) => {
    if (member) {
      setSelectedMemberId(member.id)
      const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
      const remaining = Math.max(1, target - member.received_qty)
      setAwardQty(Math.min(1, remaining))
    } else {
      setSelectedMemberId(selectablePendingMembers[0]?.id || '')
      setAwardQty(1)
    }
    setAwardNote('')
    setAwardError(null)
    setIsAwardModalOpen(true)
  }

  const handleConfirmAward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberId) {
      setAwardError('กรุณาเลือกสมาชิกที่จะมอบรางวัล')
      return
    }

    setIsAwarding(true)
    setAwardError(null)

    const res = await manualAwardRoundMember(selectedMemberId, Number(awardQty) || 1, awardNote)
    setIsAwarding(false)

    if (res.success) {
      setIsAwardModalOpen(false)
      if (onRefreshData) onRefreshData()
    } else {
      setAwardError(res.error || 'เกิดข้อผิดพลาดในการมอบรางวัล')
    }
  }

  const currentSelectedMember = selectablePendingMembers.find(m => m.id === selectedMemberId)
  const selectedTarget = currentSelectedMember
    ? currentSelectedMember.base_quota + currentSelectedMember.transferred_in_quota - currentSelectedMember.transferred_out_quota
    : 0
  const selectedRemaining = currentSelectedMember ? Math.max(0, selectedTarget - currentSelectedMember.received_qty) : 0

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all flex flex-col">
      {/* Tab Navigation Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={14} />
            <span>กำลังรอรับ</span>
            <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {pendingMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>ได้รับครบแล้ว</span>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {completedMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History size={14} />
            <span>Audit Log ประวัติ</span>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Right Tools: Admin Direct Award Button + Search */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {isAdmin && (
            <button
              onClick={() => handleOpenAwardModal()}
              disabled={selectablePendingMembers.length === 0}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="เลือกสมาชิกที่พร้อมและมอบรางวัลโดยตรง"
            >
              <Award size={14} />
              <span>เลือกคนรับสิทธิ์ประมูล</span>
            </button>
          )}

          {activeTab !== 'logs' && (
            <div className="relative flex-1 lg:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือ UID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 transition"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-3 sm:p-4 min-h-[350px]">
        {isLoading && members.length === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse px-1">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>กำลังดึงข้อมูลสมาชิกและสถานะโควตาของรอบ...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div
                  key={`skeleton-card-${i}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 animate-pulse shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="w-24 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="w-16 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="space-y-1 text-right">
                      <div className="w-12 h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md ml-auto" />
                      <div className="w-16 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Pending Members Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-2">
                {filteredPending.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm space-y-2">
                    {members.length === 0 ? (
                      <>
                        <div className="text-2xl">📋</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">ยังไม่ได้เริ่มรอบการประมูล ({itemInfo.label})</div>
                        <div className="text-xs text-slate-400">
                          หัวกิลด์สามารถกดปุ่ม <span className="font-bold text-blue-500">"ตั้งค่ารอบ"</span> ด้านบน เพื่อกำหนดโควตาที่ต้องการและเริ่มรอบการประมูลได้ทันทีครับ
                        </div>
                      </>
                    ) : (
                      <>🎉 สมาชิกทุกคนในรอบนี้ได้รับไอเทมครบตามโควตาแล้ว!</>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {filteredPending.map((member, index) => {
                      const profile = member.profiles || {}
                      const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
                      const isSkipped = member.status === 'skipped'
                      const isTransferred = member.status === 'transferred' || target <= 0
                      const remaining = Math.max(0, target - member.received_qty)

                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {member.queue_order || index + 1}
                            </span>
                            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden relative">
                              {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
                              ) : (
                                profile.display_name?.[0] || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                {profile.display_name || 'ไม่ระบุชื่อ'}
                                {profile.role === 'admin' && (
                                  <ShieldCheck size={12} className="text-blue-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                UID: {profile.uid_game || '-'}
                              </div>
                            </div>
                          </div>

                          {/* Quota & Action */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                                {member.received_qty}/{target} ชิ้น
                              </div>
                              <div className="text-[9px] text-slate-400">
                                {isSkipped ? (
                                  <span className="text-red-500 font-bold">สละสิทธิ์รอบนี้</span>
                                ) : isTransferred ? (
                                  <span className="text-blue-500 font-bold">โอนสิทธิ์หมด</span>
                                ) : (
                                  <span>รอรับอีก {remaining} ชิ้น</span>
                                )}
                              </div>
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-2">
                                {remaining > 0 && !isSkipped && !isTransferred && (
                                  <button
                                    onClick={() => handleOpenAwardModal(member)}
                                    className="p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/40 text-green-600 rounded-lg transition cursor-pointer"
                                    title="มอบรางวัลให้คนนี้โดยตรง"
                                  >
                                    <Award size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => onSwapOrder(member)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition cursor-pointer"
                                  title="สลับลำดับคิว"
                                >
                                  <ArrowUpDown size={13} />
                                </button>
                                <button
                                  onClick={() => onTransferForMember(member)}
                                  className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-500 rounded-lg transition cursor-pointer"
                                  title="โอนสิทธิ์ให้ผู้อื่น"
                                >
                                  <ArrowRightLeft size={13} />
                                </button>
                                <button
                                  onClick={() => onSkipMember(member)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg transition cursor-pointer"
                                  title="ข้ามสิทธิ์รอบนี้"
                                >
                                  <UserX size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. Completed Members Tab */}
            {activeTab === 'completed' && (
              <div className="space-y-2">
                {filteredCompleted.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                    ยังไม่มีสมาชิกที่ได้รับครบตามโควตาในรอบนี้
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {filteredCompleted.map(member => {
                      const profile = member.profiles || {}
                      const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota

                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-xl border border-green-200/60 dark:border-green-900/40 bg-green-50/30 dark:bg-green-950/10 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              ✓
                            </span>
                            <div className="w-9 h-9 rounded-full bg-linear-to-tr from-green-500 to-emerald-500 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden relative">
                              {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
                              ) : (
                                profile.display_name?.[0] || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                {profile.display_name || 'ไม่ระบุชื่อ'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                UID: {profile.uid_game || '-'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold font-mono text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                              <CheckCircle2 size={13} /> {member.received_qty}/{target} ชิ้น
                            </div>
                            <div className="text-[9px] text-green-600/80 font-medium">
                              ครบโควตารอบ {roundNumber}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. Audit Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                    ยังไม่มีบันทึกประวัติในรอบนี้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => {
                      const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'
                      const actionType = log.action_type
                      const isAward = actionType === 'AWARD' || actionType === 'MANUAL_OVERRIDE'
                      const isTransfer = actionType === 'TRANSFER'
                      const isSwap = actionType === 'SWAP'
                      const isSkip = actionType === 'SKIP'

                      return (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-start sm:items-center gap-2.5">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                                isAward
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : isTransfer
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                  : isSwap
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  : isSkip
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {actionType}
                            </span>
                            <div>
                              <div className="text-slate-800 dark:text-slate-200 font-medium">
                                {log.note || `ดำเนินการ ${actionType}`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                เป้าหมาย: <span className="font-semibold text-slate-600 dark:text-slate-300">{log.target?.display_name || '-'}</span>
                                {log.related && (
                                  <span> | เกี่ยวข้อง: <span className="font-semibold text-slate-600 dark:text-slate-300">{log.related?.display_name}</span></span>
                                )}
                                {log.admin && (
                                  <span> | โดย: <span className="text-blue-500 font-semibold">{log.admin?.display_name}</span></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono sm:text-right shrink-0">
                            {dateStr}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 🎯 Modal: เลือกคนที่จะประมูล / มอบสิทธิ์โดยตรง (เฉพาะคนที่ยังไม่ complete) */}
      {isAwardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-xl">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    เลือกสมาชิกเพื่อมอบรางวัล ({itemInfo.label})
                  </h3>
                  <p className="text-xs text-slate-400">
                    แสดงเฉพาะสมาชิกที่ยังได้ของไม่ครบในรอบที่ {roundNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAward} className="p-4 sm:p-5 space-y-4">
              {awardError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{awardError}</span>
                </div>
              )}

              {/* Member Selection (Filter out completed members) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เลือกสมาชิกที่พร้อมรับไอเทม:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={e => {
                    setSelectedMemberId(e.target.value)
                    const m = selectablePendingMembers.find(item => item.id === e.target.value)
                    if (m) {
                      const t = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
                      const rem = Math.max(1, t - m.received_qty)
                      setAwardQty(Math.min(1, rem))
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-green-500 font-medium"
                  required
                >
                  <option value="">-- เลือกสมาชิก (เฉพาะคนที่ยังไม่ครบโควตา) --</option>
                  {selectablePendingMembers.map(m => {
                    const t = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
                    const rem = Math.max(0, t - m.received_qty)
                    return (
                      <option key={`select-mem-${m.id}`} value={m.id}>
                        คิวที่ #{m.queue_order} - {m.profiles?.display_name || 'ไม่ระบุชื่อ'} (ได้แล้ว {m.received_qty}/{t} ชิ้น - ขาดอีก {rem})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Member Status Summary */}
              {currentSelectedMember && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">สถานะปัจจุบัน:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {currentSelectedMember.received_qty}/{selectedTarget} ชิ้น
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">โควตาสูงสุดที่มอบได้ตอนนี้:</span>
                    <span className="font-bold text-green-600 dark:text-green-400 font-mono">
                      {selectedRemaining} ชิ้น
                    </span>
                  </div>
                </div>
              )}

              {/* Award Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  จำนวนชิ้นที่มอบให้ในครั้งนี้:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={selectedRemaining || 10}
                    value={awardQty}
                    onChange={e => setAwardQty(Math.max(1, Math.min(selectedRemaining || 10, parseInt(e.target.value) || 1)))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono outline-none focus:border-green-500 text-center"
                    required
                  />
                  <span className="text-xs text-slate-500 font-bold shrink-0">ชิ้น</span>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  หมายเหตุ (ไม่บังคับ):
                </label>
                <input
                  type="text"
                  placeholder="เช่น มอบในกิลด์วอร์, ชนะประมูล"
                  value={awardNote}
                  onChange={e => setAwardNote(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-green-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAwardModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAwarding || !selectedMemberId}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
                >
                  {isAwarding ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  {isAwarding ? 'กำลังบันทึก...' : 'ยืนยันการมอบรางวัล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
