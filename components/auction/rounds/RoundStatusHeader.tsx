'use client'

import Image from 'next/image'
import { ITEM_CONFIG } from '../constants'
import { ItemType } from '@/app/actions/auction'
import { RefreshCw, Settings, ArrowRightLeft, FastForward, CheckCircle2, Clock, Sparkles } from 'lucide-react'

type RoundStatusHeaderProps = {
  activeItem: ItemType
  activeRound?: any
  myQuota?: any
  isAdmin: boolean
  onOpenSettings: () => void
  onOpenTransfer: () => void
  onOpenAdvance: () => void
  onAutoPopulate: () => void
  onRefresh: () => void
  isLoading?: boolean
}

export default function RoundStatusHeader({
  activeItem,
  activeRound,
  myQuota,
  isAdmin,
  onOpenSettings,
  onOpenTransfer,
  onOpenAdvance,
  onAutoPopulate,
  onRefresh,
  isLoading,
}: RoundStatusHeaderProps) {
  const itemInfo = ITEM_CONFIG[activeItem]
  const roundNum = activeRound?.round_number || 1
  const baseQuota = activeRound?.base_quota_per_member || 1
  const totalEligible = activeRound?.total_eligible_members || 0
  const completedCount = activeRound?.completed_members_count || 0
  const percentComplete = totalEligible > 0 ? Math.min(100, Math.round((completedCount / totalEligible) * 100)) : 0

  // My Quota Calculation
  const myBase = myQuota?.base_quota || baseQuota
  const myIn = myQuota?.transferred_in_quota || 0
  const myOut = myQuota?.transferred_out_quota || 0
  const myTarget = myBase + myIn - myOut
  const myReceived = myQuota?.received_qty || 0
  const myStatus = myQuota?.status || 'pending'
  const isMyCompleted = myReceived >= myTarget && myTarget > 0

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm mb-4 transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left: Item & Round Info */}
        <div className="flex items-center gap-3.5">
          <div className={`w-14 h-14 bg-linear-to-b ${itemInfo.color} rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative shadow-inner shrink-0`}>
            <Image src={itemInfo.icon} alt={itemInfo.label} fill className="object-contain p-1.5" sizes="56px" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {activeRound ? `รอบที่ ${roundNum} (Round ${roundNum})` : 'ยังไม่ได้เริ่มรอบ'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {activeRound ? `โควตาเป้าหมายคนละ ${baseQuota} ชิ้น` : 'กดตั้งค่ารอบเพื่อเริ่มต้น'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-0.5">
              {itemInfo.label}
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
                {activeRound ? `(${completedCount}/${totalEligible} คน)` : '(0 คน)'}
              </span>
            </h2>
          </div>
        </div>

        {/* Right: Personal Status & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Personal Badge */}
          {activeRound ? (
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">โควตาของคุณ:</span>
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <span className={isMyCompleted ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}>
                  {myReceived}/{myTarget} ชิ้น
                </span>
                {myIn > 0 && <span className="text-[10px] text-blue-500 font-sans">(+โอน {myIn})</span>}
                {myOut > 0 && <span className="text-[10px] text-red-500 font-sans">(-โอน {myOut})</span>}
              </div>
              {isMyCompleted ? (
                <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 size={12} /> ครบแล้ว
                </span>
              ) : myStatus === 'transferred' ? (
                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  โอนสิทธิ์หมดแล้ว
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  <Clock size={12} /> กำลังรอ
                </span>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <button
            onClick={onOpenTransfer}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="โอนสิทธิ์ให้เพื่อนในกิลด์"
          >
            <ArrowRightLeft size={14} /> โอนสิทธิ์
          </button>

          {isAdmin && (
            <>
              <button
                onClick={onAutoPopulate}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="จัดสล็อตอัตโนมัติตามลำดับคิวในรอบ"
              >
                <Sparkles size={14} /> จัดคิวออโต้
              </button>
              <button
                onClick={onOpenSettings}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="ตั้งค่ารอบและโควตา"
              >
                <Settings size={14} /> ตั้งค่ารอบ
              </button>
              <button
                onClick={onOpenAdvance}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="ปิดรอบนี้และขึ้นรอบถัดไป"
              >
                <FastForward size={14} /> จบรอบ/ขึ้นรอบถัดไป
              </button>
            </>
          )}

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-xl transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            ความคืบหน้าของกิลด์ในรอบที่ {roundNum}
          </span>
          <span className="font-mono text-blue-600 dark:text-blue-400 font-black">
            {percentComplete}% ({completedCount}/{totalEligible} คน)
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
          <div
            className="bg-linear-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>
    </div>
  )
}
