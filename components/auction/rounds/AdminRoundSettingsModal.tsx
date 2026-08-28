'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ItemType } from '@/app/actions/auction'
import { ITEM_CONFIG } from '../constants'
import { 
  startOrConfigureRound, 
  advanceToNextRound, 
  batchConfigureAllRoundQuotas,
  rollbackOrDeleteCurrentRound,
  resetAllGuildRounds
} from '@/app/actions/auction-rounds'
import { X, Settings, FastForward, CheckCircle2, AlertCircle, Loader2, Sliders, RotateCcw, Trash2 } from 'lucide-react'

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
  const [singleQuota, setSingleQuota] = useState<string | number>(activeRound?.base_quota_per_member || 2)
  const [rolloverIncomplete, setRolloverIncomplete] = useState(true)

  // 🌟 Unified 4-Item Batch Quotas State (allow empty string for smooth typing)
  const [batchQuotas, setBatchQuotas] = useState<Record<ItemType, string | number>>({
    Album: 2,
    Puppet: 2,
    White: 3,
    RedBlack: 5,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSingleQuota(activeRound?.base_quota_per_member || 2)
      
      const initialQuotas: Record<ItemType, string | number> = {
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

  if (!isOpen || !mounted) return null

  const itemInfo = ITEM_CONFIG[activeItem]

  const handleRollbackSingleItem = async () => {
    const isRound1 = currentRoundNum <= 1
    const promptMsg = isRound1 
      ? `คุณต้องการ "ลบและรีเซ็ตรอบที่ 1" ของ "${itemInfo.label}" ใช่หรือไม่?\n(ข้อมูลสิทธิ์และคิวในรอบนี้จะถูกลบออกทั้งหมด)`
      : `คุณต้องการ "ย้อนกลับไปรอบที่ ${currentRoundNum - 1}" ของ "${itemInfo.label}" ใช่หรือไม่?\n(รอบที่ ${currentRoundNum} จะถูกลบออก และเปิดรอบที่ ${currentRoundNum - 1} กลับมาใช้งาน)`
    
    if (!confirm(promptMsg)) return

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await rollbackOrDeleteCurrentRound(activeItem)
      if (res.success) {
        alert(isRound1 ? `ลบและรีเซ็ตรอบของ "${itemInfo.label}" เรียบร้อยแล้ว` : `ย้อนกลับไปรอบที่ ${currentRoundNum - 1} เรียบร้อยแล้ว`)
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการย้อนกลับรอบ')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetAllRounds = async () => {
    if (!confirm('⚠️ คำเตือน: คุณต้องการ "รีเซ็ตและล้างข้อมูลรอบการประมูลของทั้ง 4 ไอเทมทั้งหมด" ใช่หรือไม่?\n(ข้อมูลรอบและสมาชิกในรอบทั้งหมดจะถูกล้างออกเหมือนเริ่มต้นใหม่)')) return

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await resetAllGuildRounds()
      if (res.success) {
        alert('รีเซ็ตข้อมูลรอบการประมูลของกิลด์ทั้งหมดเรียบร้อยแล้ว')
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการรีเซ็ตรอบทั้งหมด')
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isAdvance) {
        const sanitizedSingle = Math.max(1, parseInt(String(singleQuota)) || 1)
        const res = await advanceToNextRound(activeItem, sanitizedSingle, rolloverIncomplete)
        if (res.success) {
          onSuccess()
          onClose()
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการขึ้นรอบใหม่')
        }
      } else {
        const sanitizedBatch: Record<ItemType, number> = {
          Album: Math.max(1, parseInt(String(batchQuotas.Album)) || 1),
          Puppet: Math.max(1, parseInt(String(batchQuotas.Puppet)) || 1),
          White: Math.max(1, parseInt(String(batchQuotas.White)) || 1),
          RedBlack: Math.max(1, parseInt(String(batchQuotas.RedBlack)) || 1),
        }

        const res = await batchConfigureAllRoundQuotas(sanitizedBatch)
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

  const modalContent = (
    <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl w-full ${isAdvance ? 'max-w-md' : 'max-w-xl'} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative`}>
        
        {/* Full-panel Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
            <div className="w-10 h-10 border-3 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 animate-pulse">
              {isAdvance ? 'กำลังประมวลผลขึ้นรอบใหม่...' : 'กำลังบันทึกและจัดสรรโควตาของทั้ง 4 ไอเทม...'}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-blue-50/50 via-slate-50/30 to-indigo-50/50 dark:from-slate-800/60 dark:to-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${isAdvance ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'}`}>
              {isAdvance ? <FastForward size={18} /> : <Sliders size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                {isAdvance ? `จบรอบและขึ้นรอบที่ ${currentRoundNum + 1}` : 'ตั้งค่าโควตารอบประมูล'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAdvance ? `ไอเทม: ${itemInfo.label} (ปัจจุบันรอบที่ ${currentRoundNum})` : 'ปรับแต่งโควตาเป้าหมายต่อคนในรอบปัจจุบัน'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!isAdvance ? (
            <div className="space-y-3.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                กำหนดโควตาเป้าหมายต่อคนในรอบปัจจุบัน (Base Quota / Member)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_ITEMS.map(itemKey => {
                  const info = ITEM_CONFIG[itemKey]
                  return (
                    <div
                      key={`batch-quota-${itemKey}`}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                          <Image src={info.icon} alt={info.label} width={22} height={22} className="object-contain" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{info.label}</div>
                          <div className="text-[10px] text-slate-400">รอบที่ {activeRounds.find(r => r.item_name === itemKey)?.round_number || 1}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={batchQuotas[itemKey] ?? ''}
                          disabled={isSubmitting}
                          onChange={e => {
                            const val = e.target.value
                            setBatchQuotas(prev => ({ ...prev, [itemKey]: val }))
                          }}
                          className="w-14 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-black text-center outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">ชิ้น</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Danger Zone: Rollback & Reset Rounds */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <RotateCcw size={12} /> การจัดการและย้อนกลับรอบ (Round Actions)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRollbackSingleItem}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {currentRoundNum > 1 ? `ย้อนกลับไปรอบที่ ${currentRoundNum - 1} (${itemInfo.label})` : `ลบ/รีเซ็ตรอบที่ 1 (${itemInfo.label})`}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAllRounds}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} /> รีเซ็ตข้อมูลรอบทั้งหมด (4 ไอเทม)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  โควตาเป้าหมายต่อคนในรอบที่ {currentRoundNum + 1}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={singleQuota ?? ''}
                    disabled={isSubmitting}
                    onChange={e => setSingleQuota(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black font-mono text-center outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500 font-bold">ชิ้น / คน</span>
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
                      สมาชิกที่ได้ของไม่ครบจะได้รับสิทธิ์ขึ้นคิวแรกในรอบถัดไป
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
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

  return createPortal(modalContent, document.body)
}
