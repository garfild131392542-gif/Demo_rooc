'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ItemType } from '@/app/actions/auction'
import { CheckCircle2, Clock, ArrowRightLeft, UserX, ArrowUpDown, History, ShieldCheck, Search, Filter } from 'lucide-react'

type RoundMemberTabsProps = {
  members: any[]
  logs: any[]
  isAdmin: boolean
  activeItem: ItemType
  roundNumber: number
  onSwapOrder: (member: any) => void
  onSkipMember: (member: any) => void
  onTransferForMember: (member: any) => void
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
  isLoading,
}: RoundMemberTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'logs'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter members
  const completedMembers = members.filter(m => {
    const target = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
    return m.status === 'completed' || (m.received_qty >= target && target > 0)
  })

  const pendingMembers = members.filter(m => {
    const target = m.base_quota + m.transferred_in_quota - m.transferred_out_quota
    return m.status !== 'completed' && !(m.received_qty >= target && target > 0)
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all flex flex-col">
      {/* Tab Navigation Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

        {/* Search Bar */}
        {activeTab !== 'logs' && (
          <div className="relative w-full sm:w-64">
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
        {/* 1. Pending Members Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-2">
            {filteredPending.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                🎉 สมาชิกทุกคนในรอบนี้ได้รับไอเทมครบตามโควตาแล้ว!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredPending.map((member, index) => {
                  const profile = member.profiles || {}
                  const target = member.base_quota + member.transferred_in_quota - member.transferred_out_quota
                  const isSkipped = member.status === 'skipped'
                  const isTransferred = member.status === 'transferred' || target <= 0

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
                              <span>รอรับอีก {Math.max(0, target - member.received_qty)} ชิ้น</span>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-2">
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
                {filteredCompleted.map((member, index) => {
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
                  const isAward = actionType === 'AWARD'
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
      </div>
    </div>
  )
}
