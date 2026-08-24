'use client'

import { useState } from 'react'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { transferRoundQuota } from '@/app/actions/auction-rounds'
import { X, ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

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

    const res = await transferRoundQuota(
      fromUserId,
      toUserId,
      activeItem,
      Number(transferQty) || 1,
      transferType,
      note
    )

    setIsSubmitting(false)

    if (res.success) {
      onSuccess()
      onClose()
    } else {
      setError(res.error || 'เกิดข้อผิดพลาดในการโอนสิทธิ์')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
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
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
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

          {/* From Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              1. ผู้โอนสิทธิ์ (สมาชิกที่ต้องการยกสิทธิ์ให้เพื่อน)
            </label>
            <select
              value={fromUserId}
              onChange={e => setFromUserId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              required
            >
              <option value="">-- เลือกสมาชิกผู้โอนสิทธิ์ --</option>
              {guildMembers.map(m => (
                <option key={`from-${m.id}`} value={m.id}>
                  {m.display_name} (UID: {m.uid_game || '-'})
                </option>
              ))}
            </select>
          </div>

          {/* To Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              2. ผู้รับโอนสิทธิ์ (สมาชิกที่จะได้รับโควตาเพิ่ม)
            </label>
            <select
              value={toUserId}
              onChange={e => setToUserId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500 font-medium"
              required
            >
              <option value="">-- เลือกสมาชิกผู้รับโอน --</option>
              {guildMembers
                .filter(m => m.id !== fromUserId)
                .map(m => (
                  <option key={`to-${m.id}`} value={m.id}>
                    {m.display_name} (UID: {m.uid_game || '-'})
                  </option>
                ))}
            </select>
          </div>

          {/* Transfer Type (Full vs Partial) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTransferType('partial')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                transferType === 'partial'
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-black mb-0.5">🔹 โอนบางส่วน (Partial)</div>
              <div className="text-[10px] opacity-80">ระบุจำนวนชิ้นที่ต้องการโอน</div>
            </button>

            <button
              type="button"
              onClick={() => setTransferType('full')}
              className={`p-3 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                transferType === 'full'
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="font-black mb-0.5">🌟 โอนสิทธิ์ทั้งหมด (Full)</div>
              <div className="text-[10px] opacity-80">ยกโควตาคงเหลือทั้งหมดให้</div>
            </button>
          </div>

          {/* Quantity Input (Only for Partial) */}
          {transferType === 'partial' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                จำนวนที่ต้องการโอน ({itemInfo.label})
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={transferQty}
                onChange={e => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono outline-none focus:border-blue-500"
                required
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              หมายเหตุ / เหตุผล (ไม่บังคับ)
            </label>
            <input
              type="text"
              placeholder="เช่น ยกสิทธิ์ให้เพื่อน, สมาชิกไม่อยู่"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการโอนสิทธิ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
