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
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<'all' | number>('all')
  const [logPage, setLogPage] = useState(1)

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
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock size={13} className="shrink-0" />
              <span>
                <span className="sm:hidden">รอรับ</span>
                <span className="hidden sm:inline">กำลังรอรับ</span>
              </span>
            </div>
            <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {pendingMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <CheckCircle2 size={13} className="shrink-0" />
              <span>
                <span className="sm:hidden">ได้รับ</span>
                <span className="hidden sm:inline">ได้รับครบแล้ว</span>
              </span>
            </div>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {completedMembers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <History size={13} className="shrink-0" />
              <span>
                <span className="sm:hidden">ประวัติ</span>
                <span className="hidden sm:inline">Audit Log ประวัติ</span>
              </span>
            </div>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Right Tools: Search */}
        {activeTab !== 'logs' && (
          <div className="relative w-full lg:w-64">
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

      {/* Tab Contents */}
      <div className="p-3 sm:p-4 min-h-[350px]">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse px-1">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>กำลังดึงข้อมูลสมาชิกและสถานะโควตาของรอบ...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3, 4].map(i => (
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
              <div className="flex flex-col gap-2.5">
                {[5, 6, 7, 8].map(i => (
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
          </div>
        ) : (
          <>
            {/* 1. Pending Members Tab */}
            {activeTab === 'pending' && (() => {
              const halfPending = Math.ceil(filteredPending.length / 2)
              const pendingCol1 = filteredPending.slice(0, halfPending)
              const pendingCol2 = filteredPending.slice(halfPending)

              const renderPendingCard = (member: any, index: number) => {
                const profile = member.profiles || {}
                const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
                const isSkipped = member.status === 'skipped'
                const isTransferred = member.status === 'transferred' || target <= 0
                const remaining = Math.max(0, target - member.received_qty)

                return (
                  <div
                    key={member.id}
                    className="p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-2 sm:gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        #{member.queue_order || index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                          {profile.display_name || 'ไม่ระบุชื่อ'}
                          {profile.role === 'admin' && (
                            <ShieldCheck size={12} className="text-blue-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quota & Action */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {member.received_qty}/{target} ชิ้น
                        </div>
                        <div className="text-[9px] text-slate-400 whitespace-nowrap">
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
                        <div className="flex items-center gap-0.5 sm:gap-1 border-l border-slate-100 dark:border-slate-800 pl-1.5 sm:pl-2">
                          {remaining > 0 && !isSkipped && !isTransferred && (
                            <button
                              onClick={() => handleOpenAwardModal(member)}
                              className="p-1 sm:p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/40 text-green-600 rounded-lg transition cursor-pointer"
                              title="มอบรางวัลให้คนนี้โดยตรง"
                            >
                              <Award size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => onSwapOrder(member)}
                            className="p-1 sm:p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition cursor-pointer"
                            title="สลับลำดับคิว"
                          >
                            <ArrowUpDown size={13} />
                          </button>
                          <button
                            onClick={() => onTransferForMember(member)}
                            className="p-1 sm:p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-500 rounded-lg transition cursor-pointer"
                            title="โอนสิทธิ์ให้ผู้อื่น"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                          <button
                            onClick={() => onSkipMember(member)}
                            className="p-1 sm:p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg transition cursor-pointer"
                            title="ข้ามสิทธิ์รอบนี้"
                          >
                            <UserX size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              return (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
                      <div className="flex flex-col gap-2.5">
                        {pendingCol1.map((member, idx) => renderPendingCard(member, idx))}
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {pendingCol2.map((member, idx) => renderPendingCard(member, halfPending + idx))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 2. Completed Members Tab */}
            {activeTab === 'completed' && (() => {
              const halfCompleted = Math.ceil(filteredCompleted.length / 2)
              const completedCol1 = filteredCompleted.slice(0, halfCompleted)
              const completedCol2 = filteredCompleted.slice(halfCompleted)

              const renderCompletedCard = (member: any) => {
                const profile = member.profiles || {}
                const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota

                return (
                  <div
                    key={member.id}
                    className="p-2.5 sm:p-3 rounded-xl border border-green-200/60 dark:border-green-900/40 bg-green-50/30 dark:bg-green-950/10 flex items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-bold font-mono text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded shrink-0">
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                          {profile.display_name || 'ไม่ระบุชื่อ'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-green-600 dark:text-green-400 flex items-center gap-1 justify-end whitespace-nowrap">
                        <CheckCircle2 size={13} /> {member.received_qty}/{target} ชิ้น
                      </div>
                      <div className="text-[9px] text-green-600/80 font-medium whitespace-nowrap">
                        ครบโควตารอบ {roundNumber}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  {filteredCompleted.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                      ยังไม่มีสมาชิกที่ได้รับครบตามโควตาในรอบนี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-start">
                      <div className="flex flex-col gap-2.5">
                        {completedCol1.map(member => renderCompletedCard(member))}
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {completedCol2.map(member => renderCompletedCard(member))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 3. Audit Logs Tab */}
            {activeTab === 'logs' && (() => {
              const LOGS_PER_PAGE = 8
              const availableLogRounds = Array.from(new Set(logs.map(l => l.round_number || 1))).sort((a, b) => b - a)
              const filteredLogs = selectedRoundFilter === 'all'
                ? logs
                : logs.filter(l => (l.round_number || 1) === selectedRoundFilter)

              const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE))
              const safeLogPage = Math.min(logPage, totalLogPages)
              const paginatedLogs = filteredLogs.slice((safeLogPage - 1) * LOGS_PER_PAGE, safeLogPage * LOGS_PER_PAGE)

              return (
                <div className="space-y-3">
                  {/* Round Filter Selector Bar */}
                  {availableLogRounds.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoundFilter('all')
                            setLogPage(1)
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            selectedRoundFilter === 'all'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          <span>🌐 ทุกรอบทั้งหมด</span>
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                            {logs.length}
                          </span>
                        </button>

                        {availableLogRounds.map(rNum => (
                          <button
                            key={`filter-round-${rNum}`}
                            type="button"
                            onClick={() => {
                              setSelectedRoundFilter(rNum)
                              setLogPage(1)
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              selectedRoundFilter === rNum
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <span>รอบที่ {rNum} {rNum === roundNumber ? '(ปัจจุบัน)' : ''}</span>
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                              {logs.filter(l => (l.round_number || 1) === rNum).length}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-400 px-2 font-mono">
                        รวม {filteredLogs.length} รายการ
                      </div>
                    </div>
                  )}

                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                      ยังไม่มีบันทึกประวัติในรอบที่เลือก
                    </div>
                  ) : (
                    <>
                      {/* Scrollable Container with Custom Scrollbar */}
                      <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-300">
                        {paginatedLogs.map(log => {
                          const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'
                          const actionType = log.action_type
                          const logRound = log.round_number || 1

                          const getActionInfo = (type: string) => {
                            switch (type) {
                              case 'MANUAL_OVERRIDE':
                                return { text: '🛠️ แอดมินปรับคิว', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' }
                              case 'AWARD':
                                return { text: '🎁 มอบรางวัล', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' }
                              case 'TRANSFER':
                                return { text: '🔁 โอนสิทธิ์', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
                              case 'SWAP':
                                return { text: '🔀 สลับคิว', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' }
                              case 'SKIP':
                                return { text: '⏭️ ข้ามสิทธิ์', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' }
                              case 'ROUND_START':
                                return { text: '🚀 เริ่มรอบใหม่', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' }
                              default:
                                return { text: type, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' }
                            }
                          }

                          const actionBadge = getActionInfo(actionType)

                          return (
                            <div
                              key={log.id}
                              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70 transition flex flex-col gap-1.5 text-xs shadow-2xs"
                            >
                              {/* Top row: Round badge + Action badge + Timestamp */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-sans">
                                    รอบที่ {logRound}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${actionBadge.color}`}>
                                    {actionBadge.text}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {dateStr}
                                </div>
                              </div>

                              {/* Bottom row: Note / Detail in full width */}
                              <div className="pt-0.5">
                                <div className="text-slate-800 dark:text-slate-200 font-medium leading-snug">
                                  {log.note || `ดำเนินการ ${actionType}`}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                  <span>เป้าหมาย: <span className="font-semibold text-slate-600 dark:text-slate-300">{log.target?.display_name || '-'}</span></span>
                                  {log.related && (
                                    <span>| เกี่ยวข้อง: <span className="font-semibold text-slate-600 dark:text-slate-300">{log.related?.display_name}</span></span>
                                  )}
                                  {log.admin && (
                                    <span>| โดย: <span className="text-blue-500 font-semibold">{log.admin?.display_name}</span></span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Pagination Footer Controls */}
                      {totalLogPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            แสดงหน้า <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{safeLogPage}</span> จากทั้งหมด <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{totalLogPages}</span> หน้า
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setLogPage(1)}
                              disabled={safeLogPage <= 1}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              title="หน้าแรกสุด"
                            >
                              ««
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogPage(p => Math.max(1, p - 1))}
                              disabled={safeLogPage <= 1}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                            >
                              ‹ ก่อนหน้า
                            </button>

                            {/* Page Numbers */}
                            {Array.from({ length: totalLogPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalLogPages || Math.abs(p - safeLogPage) <= 1)
                              .map((p, idx, arr) => {
                                const prev = arr[idx - 1]
                                return (
                                  <span key={`log-page-${p}`} className="flex items-center">
                                    {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                                    <button
                                      type="button"
                                      onClick={() => setLogPage(p)}
                                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                                        p === safeLogPage
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  </span>
                                )
                              })}

                            <button
                              type="button"
                              onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                              disabled={safeLogPage >= totalLogPages}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                            >
                              ถัดไป ›
                            </button>
                            <button
                              type="button"
                              onClick={() => setLogPage(totalLogPages)}
                              disabled={safeLogPage >= totalLogPages}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              title="หน้าสุดท้าย"
                            >
                              »»
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
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
                    onFocus={e => e.target.select()}
                    onChange={e => setAwardQty(e.target.value as any)}
                    onBlur={e => {
                      const val = parseInt(e.target.value)
                      if (isNaN(val) || val < 1) {
                        setAwardQty(1)
                      } else {
                        setAwardQty(Math.min(selectedRemaining || 10, val))
                      }
                    }}
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
