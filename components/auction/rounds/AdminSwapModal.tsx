'use client'

import { useState } from 'react'
import { swapRoundQueueOrder, skipOrDeferRoundMember } from '@/app/actions/auction-rounds'
import { X, ArrowUpDown, AlertCircle, CheckCircle2, UserX } from 'lucide-react'

type AdminSwapModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  targetMember?: any
  pendingMembers: any[]
}

export default function AdminSwapModal({
  isOpen,
  onClose,
  onSuccess,
  targetMember,
  pendingMembers,
}: AdminSwapModalProps) {
  const [swapWithMemberId, setSwapWithMemberId] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !targetMember) return null

  const targetProfile = targetMember.profiles || {}

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!swapWithMemberId) {
      setError('กรุณาเลือกสมาชิกที่ต้องการสลับตำแหน่งด้วย')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const res = await swapRoundQueueOrder(targetMember.id, swapWithMemberId, reason)
    setIsSubmitting(false)

    if (res.success) {
      onSuccess()
      onClose()
    } else {
      setError(res.error || 'เกิดข้อผิดพลาดในการสลับคิว')
    }
  }

  const handleSkip = async () => {
    if (!confirm(`ยืนยันการข้ามคิวของ "${targetProfile.display_name}" ในรอบนี้?`)) return

    setIsSubmitting(true)
    setError(null)

    const res = await skipOrDeferRoundMember(targetMember.id, reason || 'สละสิทธิ์รอบนี้')
    setIsSubmitting(false)

    if (res.success) {
      onSuccess()
      onClose()
    } else {
      setError(res.error || 'เกิดข้อผิดพลาดในการข้ามคิว')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl">
              <ArrowUpDown size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                สลับลำดับคิวในรอบ
              </h3>
              <p className="text-xs text-slate-400">
                สลับคิวของ {targetProfile.display_name} (คิวที่ {targetMember.queue_order})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSwap} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Member Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">สมาชิกปัจจุบัน:</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">{targetProfile.display_name}</div>
            </div>
            <div className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
              ลำดับคิวที่ #{targetMember.queue_order}
            </div>
          </div>

          {/* Swap With Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              เลือกสมาชิกที่ต้องการสลับตำแหน่งด้วย:
            </label>
            <select
              value={swapWithMemberId}
              onChange={e => setSwapWithMemberId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-purple-500 font-medium"
              required
            >
              <option value="">-- เลือกสมาชิกเพื่อสลับคิว --</option>
              {pendingMembers
                .filter(m => m.id !== targetMember.id)
                .map(m => (
                  <option key={`swap-${m.id}`} value={m.id}>
                    คิวที่ #{m.queue_order} - {m.profiles?.display_name || 'ไม่ระบุชื่อ'}
                  </option>
                ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              เหตุผล (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น สมาชิกไม่พร้อม, สลับคิวให้เพื่อน"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-purple-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <UserX size={14} /> ข้ามสิทธิ์คนนี้
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันสลับคิว'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
