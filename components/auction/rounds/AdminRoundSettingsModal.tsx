'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { startOrConfigureRound, advanceToNextRound, batchConfigureAllRoundQuotas } from '@/app/actions/auction-rounds'
import { X, Settings, FastForward, CheckCircle2, AlertCircle, Loader2, Sliders } from 'lucide-react'

type AdminRoundSettingsModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  activeItem: ItemType
  activeRound?: any
  activeRounds?: any[]
  mode?: 'settings' | 'advance'
}

const ALL_ITEMS: ItemType[] = ['Album', 'Puppet', 'White', 'RedBlack']

export default function AdminRoundSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  activeItem,
  activeRound,
  activeRounds = [],
  mode = 'settings',
}: AdminRoundSettingsModalProps) {
  const isAdvance = mode === 'advance'
  const currentRoundNum = activeRound?.round_number || 1

  // Single item state (for advance mode)
  const [singleQuota, setSingleQuota] = useState(activeRound?.base_quota_per_member || 2)
  const [rolloverIncomplete, setRolloverIncomplete] = useState(true)

  // 🌟 Unified 4-Item Batch Quotas State
  const [batchQuotas, setBatchQuotas] = useState<Record<ItemType, number>>({
    Album: 2,
    Puppet: 2,
    White: 3,
    RedBlack: 5,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSingleQuota(activeRound?.base_quota_per_member || 2)
      
      // Load current quotas for all 4 items from activeRounds
      const initialQuotas: Record<ItemType, number> = {
        Album: 2,
        Puppet: 2,
        White: 3,
        RedBlack: 5,
      }

      if (activeRounds && activeRounds.length > 0) {
        activeRounds.forEach(r => {
          if (r.item_name && r.base_quota_per_member) {
            initialQuotas[r.item_name as ItemType] = r.base_quota_per_member
          }
        })
      }

      setBatchQuotas(initialQuotas)
      setError(null)
      setIsSubmitting(false)
    }
  }, [isOpen, activeRound, activeRounds])

  if (!isOpen) return null

  const itemInfo = ITEM_CONFIG[activeItem]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isAdvance) {
        const res = await advanceToNextRound(activeItem, Number(singleQuota) || 2, rolloverIncomplete)
        if (res.success) {
          onSuccess()
          onClose()
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการขึ้นรอบใหม่')
        }
      } else {
        // 🌟 Unified Save for all 4 items in 1 single click!
        const res = await batchConfigureAllRoundQuotas(batchQuotas)
        if (res.success) {
          onSuccess()
          onClose()
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกโควตารอบ')
        }
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full ${isAdvance ? 'max-w-md' : 'max-w-xl'} shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 relative`}>
        
        {/* Full-panel Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
            <div className="w-10 h-10 border-3 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 animate-pulse">
              {isAdvance ? 'กำลังประมวลผลขึ้นรอบใหม่...' : 'กำลังบันทึกและจัดสรรโควตาของทั้ง 4 ไอเทมให้สมาชิกทุกคน...'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isAdvance ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'}`}>
              {isAdvance ? <FastForward size={18} /> : <Sliders size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                {isAdvance ? `ปิดรอบที่ ${currentRoundNum} ➔ ขึ้นรอบที่ ${currentRoundNum + 1} (${itemInfo.label})` : 'ตั้งค่าโควตารอบการประมูลของกิลด์ (ครบ 4 ไอเทม)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAdvance ? 'ปิดรอบปัจจุบันและเริ่มวนรับใหม่ในรอบถัดไป' : 'กำหนดโควตาเป้าหมายที่สมาชิกแต่ละคนจะได้รับในรอบนี้'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
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

          {/* Mode 1: Unified 4-Item Quota Setup */}
          {!isAdvance ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                กำหนดจำนวนชิ้นเป้าหมายที่สมาชิก 1 คนจะได้รับในรอบนี้ เมื่อบันทึกระบบจะอัปเดตสมาชิกทุกคนทันที:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_ITEMS.map(itemKey => {
                  const info = ITEM_CONFIG[itemKey]
                  const currentRound = activeRounds.find(r => r.item_name === itemKey)
                  const roundNum = currentRound?.round_number || 1

                  return (
                    <div
                      key={itemKey}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 p-1">
                          <Image
                            src={info.icon}
                            alt={info.label}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {info.label}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            รอบที่ #{roundNum}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={batchQuotas[itemKey] || 1}
                          disabled={isSubmitting}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value) || 1)
                            setBatchQuotas(prev => ({ ...prev, [itemKey]: val }))
                          }}
                          className="w-16 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-black font-mono text-center outline-none focus:border-blue-500 disabled:opacity-50"
                          required
                        />
                        <span className="text-[11px] text-slate-400 font-bold">ชิ้น</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>
                  กิลด์สามารถปรับลดหรือเพิ่มโควตาของแต่ละไอเทมได้อย่างอิสระ เมื่อกดบันทึก ระบบจะคำนวณสิทธิ์และจัดเรียงสล็อตกระดานประมูลให้อัตโนมัติครับ
                </span>
              </div>
            </div>
          ) : (
            /* Mode 2: Advance to Next Round */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  โควตาเป้าหมายต่อคนในรอบที่ {currentRoundNum + 1} ({itemInfo.label})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={singleQuota}
                    disabled={isSubmitting}
                    onChange={e => setSingleQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono outline-none focus:border-emerald-500 text-center disabled:opacity-50"
                    required
                  />
                  <span className="text-xs text-slate-500 font-bold shrink-0">ชิ้น / คน</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rolloverIncomplete}
                    disabled={isSubmitting}
                    onChange={e => setRolloverIncomplete(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer disabled:opacity-50"
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
            </div>
          )}

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
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2 ${
                isAdvance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {isSubmitting ? 'กำลังบันทึก...' : isAdvance ? `ยืนยันขึ้นรอบที่ ${currentRoundNum + 1}` : 'บันทึกการตั้งค่าทั้ง 4 ไอเทม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
