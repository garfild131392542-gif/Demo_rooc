'use client'

import { useState } from 'react'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { startOrConfigureRound, advanceToNextRound } from '@/app/actions/auction-rounds'
import { X, Settings, FastForward, CheckCircle2, AlertCircle } from 'lucide-react'

type AdminRoundSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  activeItem: ItemType
  activeRound?: any
  mode?: 'settings' | 'advance'
}

export default function AdminRoundSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  activeItem,
  activeRound,
  mode = 'settings',
}: AdminRoundSettingsModalProps) {
  const currentRoundNum = activeRound?.round_number || 1
  const [baseQuota, setBaseQuota] = useState(activeRound?.base_quota_per_member || 2)
  const [rolloverIncomplete, setRolloverIncomplete] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const itemInfo = ITEM_CONFIG[activeItem]
  const isAdvance = mode === 'advance'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (isAdvance) {
      const res = await advanceToNextRound(activeItem, Number(baseQuota) || 2, rolloverIncomplete)
      setIsSubmitting(false)
      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการขึ้นรอบใหม่')
      }
    } else {
      const res = await startOrConfigureRound(activeItem, Number(baseQuota) || 2, currentRoundNum)
      setIsSubmitting(false)
      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการตั้งค่ารอบ')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isAdvance ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {isAdvance ? <FastForward size={18} /> : <Settings size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                {isAdvance ? `ปิดรอบที่ ${currentRoundNum} ➔ ขึ้นรอบที่ ${currentRoundNum + 1}` : `ตั้งค่ารอบและโควตา (${itemInfo.label})`}
              </h3>
              <p className="text-xs text-slate-400">
                {isAdvance ? 'ปิดรอบปัจจุบันและเริ่มวนรับใหม่ในรอบถัดไป' : `จัดการโควตารอบที่ ${currentRoundNum}`}
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

          {/* Base Quota Setting */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              โควตาเป้าหมายต่อคนใน{isAdvance ? `รอบที่ ${currentRoundNum + 1}` : `รอบที่ ${currentRoundNum}`} ({itemInfo.label})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={baseQuota}
                onChange={e => setBaseQuota(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono outline-none focus:border-blue-500 text-center"
                required
              />
              <span className="text-xs text-slate-500 font-bold shrink-0">ชิ้น / คน</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              สมาชิกทุกคนในกิลด์จะได้รับโควตาเริ่มต้นคนละ {baseQuota} ชิ้นในรอบนี้
            </p>
          </div>

          {/* Rollover Incomplete Checkbox (Only for Advance mode) */}
          {isAdvance && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rolloverIncomplete}
                  onChange={e => setRolloverIncomplete(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    ยกยอดสมาชิกที่ตกหล่น (Rollover Priority)
                  </div>
                  <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                    สมาชิกที่ยังได้ของไม่ครบในรอบที่ {currentRoundNum} จะได้รับสิทธิ์ขึ้นเป็นคิวแรกๆ ในรอบที่ {currentRoundNum + 1}
                  </div>
                </div>
              </label>
            </div>
          )}

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
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2 ${
                isAdvance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {isSubmitting ? 'กำลังบันทึก...' : isAdvance ? `ยืนยันขึ้นรอบที่ ${currentRoundNum + 1}` : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
