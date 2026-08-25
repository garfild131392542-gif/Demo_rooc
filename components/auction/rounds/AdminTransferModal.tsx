'use client'

import { useState } from 'react'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { transferRoundQuota } from '@/app/actions/auction-rounds'
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

type AdminTransferModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  activeItem: ItemType
  guildMembers: any[]
  preselectedFromMember?: any
  currentRoundNumber: number
}

export default function AdminTransferModal({
  isOpen,
  onClose,
  onSuccess,
  activeItem,
  guildMembers,
  preselectedFromMember,
  currentRoundNumber,
}: AdminTransferModalProps) {
  const [fromUserId, setFromUserId] = useState(preselectedFromMember?.user_id || '')
  const [toUserId, setToUserId] = useState('')
  const [transferType, setTransferType] = useState<'partial' | 'full'>('partial')
  const [transferQty, setTransferQty] = useState(1)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const itemInfo = ITEM_CONFIG[activeItem]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromUserId || !toUserId) {
      setError('กรุณาเลือกทั้งผู้โอนและผู้รับโอน')
      return
    }
    if (fromUserId === toUserId) {
      setError('ผู้โอนและผู้รับโอนต้องไม่ใช่คนเดียวกัน')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await transferRoundQuota(
        fromUserId,
        toUserId,
        activeItem,
        Number(transferQty) || 1,
        transferType,
        note
      )

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการโอนสิทธิ์')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative">
        
        {/* Full-panel Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
            <div className="w-10 h-10 border-3 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 animate-pulse">
              กำลังบันทึกการโอนสิทธิ์และคำนวณโควตาสุทธิใหม่...
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                โอนสิทธิ์ / ยกสิทธิ์การประมูล (รอบที่ {currentRoundNumber})
              </h3>
              <p className="text-xs text-slate-400">
                โอนโควตา {itemInfo.label} ให้สมาชิกคนอื่นในกิลด์
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transfer Type Selection */}
          <div className="flex items-center gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setTransferType('partial')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                transferType === 'partial'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              โอนบางส่วน (ระบุจำนวน)
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setTransferType('full')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                transferType === 'full'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              ยกให้ทั้งหมด (Full Transfer)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* From User */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ผู้ยกสิทธิ์ (โอนออก):
              </label>
              <select
                value={fromUserId}
                disabled={isSubmitting}
                onChange={e => setFromUserId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 font-medium disabled:opacity-50"
                required
              >
                <option value="">-- เลือกผู้โอน --</option>
                {guildMembers.map(m => (
                  <option key={`from-${m.id}`} value={m.id}>
                    {m.display_name} ({m.uid_game || '-'})
                  </option>
                ))}
              </select>
            </div>

            {/* To User */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ผู้รับสิทธิ์ (โอนเข้า):
              </label>
              <select
                value={toUserId}
                disabled={isSubmitting}
                onChange={e => setToUserId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 font-medium disabled:opacity-50"
                required
              >
                <option value="">-- เลือกผู้รับ --</option>
                {guildMembers
                  .filter(m => m.id !== fromUserId)
                  .map(m => (
                    <option key={`to-${m.id}`} value={m.id}>
                      {m.display_name} ({m.uid_game || '-'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Transfer Quantity (Only for Partial) */}
          {transferType === 'partial' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                จำนวนสิทธิ์ที่ต้องการโอน ({itemInfo.label}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={transferQty}
                  disabled={isSubmitting}
                  onFocus={e => e.target.select()}
                  onChange={e => setTransferQty(e.target.value as any)}
                  onBlur={e => {
                    const val = parseInt(e.target.value)
                    if (isNaN(val) || val < 1) setTransferQty(1)
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono outline-none focus:border-blue-500 text-center disabled:opacity-50"
                  required
                />
                <span className="text-xs text-slate-500 font-bold shrink-0">ชิ้น</span>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              เหตุผลหรือหมายเหตุ (ไม่บังคับ):
            </label>
            <input
              type="text"
              placeholder="เช่น ยกสิทธิ์ให้เพื่อน, แลกไอเทมอื่น"
              value={note}
              disabled={isSubmitting}
              onChange={e => setNote(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 disabled:opacity-50"
            />
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
              disabled={isSubmitting || !fromUserId || !toUserId}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {isSubmitting ? 'กำลังโอนสิทธิ์...' : 'ยืนยันการโอนสิทธิ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
