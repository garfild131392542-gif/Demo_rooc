'use client'

import { useState } from 'react'
import { swapRoundQueueOrder, skipOrDeferRoundMember } from '@/app/actions/auction-rounds'
import { X, ArrowUpDown, AlertCircle, CheckCircle2, UserX, Loader2 } from 'lucide-react'

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

    try {
      const res = await swapRoundQueueOrder(targetMember.id, swapWithMemberId, reason)
      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการสลับคิว')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    if (!confirm(`ยืนยันการข้ามคิวของ "${targetProfile.display_name}" ในรอบนี้?`)) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await skipOrDeferRoundMember(targetMember.id, reason || 'สละสิทธิ์รอบนี้')
      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการข้ามคิว')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* Full-panel Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
            <div className="w-10 h-10 border-3 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 animate-pulse">
              กำลังบันทึกการจัดเรียงลำดับคิวใหม่...
            </div>
          </div>
        )}

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
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition disabled:opacity-50"
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

          {/* Current Position */}
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs">
            <div className="font-bold text-purple-900 dark:text-purple-200">
              ตำแหน่งปัจจุบัน: คิวที่ #{targetMember.queue_order} ({targetProfile.display_name})
            </div>
          </div>

          {/* Select Swap Target */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ต้องการสลับตำแหน่งกับสมาชิกคนใด:
            </label>
            <select
              value={swapWithMemberId}
              disabled={isSubmitting}
              onChange={e => setSwapWithMemberId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-purple-500 font-medium disabled:opacity-50"
              required
            >
              <option value="">-- เลือกสมาชิกที่จะสลับคิวด้วย --</option>
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
              เหตุผลการสลับคิว (ไม่บังคับ):
            </label>
            <input
              type="text"
              placeholder="เช่น ติดธุระ, ตกลงสลับกัน"
              value={reason}
              disabled={isSubmitting}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Skip Shortcut */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[11px] text-slate-400">หรือต้องการข้ามคิวคนนี้ในรอบนี้?</span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSkip}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <UserX size={13} />
              <span>สละสิทธิ์/ข้ามคิว</span>
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !swapWithMemberId}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {isSubmitting ? 'กำลังสลับคิว...' : 'ยืนยันการสลับคิว'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
