'use client'

import Image from 'next/image'
import type { Dispatch, SetStateAction } from 'react'
import { ITEM_CONFIG } from './constants'

type AuctionItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

type PositionEntry = {
  startPage: string
  startSlot: string
  endPage: string
  endSlot: string
  total: number | ''
}

type PositionsState = Record<AuctionItemType, PositionEntry>

type AdminFormProps = {
  positions: PositionsState
  setPositions: Dispatch<SetStateAction<PositionsState>>
  onSave: () => Promise<void>
  isSaving: boolean
  onRefresh?: () => Promise<void>
}

export default function AdminForm({ positions, setPositions, onSave, isSaving, onRefresh }: AdminFormProps) {
  const handlePosChange = (type: AuctionItemType, field: keyof PositionEntry, val: string) => {
    setPositions(prev => {
      const updated = { ...prev[type], [field]: val }
      const sp = parseInt(updated.startPage), ss = parseInt(updated.startSlot)
      const ep = parseInt(updated.endPage), es = parseInt(updated.endSlot)

      if (!isNaN(sp) && !isNaN(ss) && !isNaN(ep) && !isNaN(es) && sp > 0 && ss > 0 && ep > 0 && es > 0) {
        if (ep > sp || (ep === sp && es >= ss)) {
          updated.total = ((ep - sp) * 4) + (es - ss) + 1
        } else {
          updated.total = 0 // ถ้าพิกัดผิด (เช่น หน้าจบ น้อยกว่า หน้าเริ่ม) ยอดเป็น 0
        }
      } else if (updated.startPage === '' && updated.startSlot === '' && updated.endPage === '' && updated.endSlot === '') {
        updated.total = 0
      }
      return { ...prev, [type]: updated }
    })
  }

  const handleTotalChange = (type: AuctionItemType, value: string) => {
    setPositions(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        total: value === '' ? '' : Math.max(0, parseInt(value) || 0)
      }
    }))
  }

  const handleSubmitSave = async () => {
    await onSave()
    await onRefresh?.()
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={handleSubmitSave}
          disabled={isSaving}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-60 cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          {isSaving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isSaving ? 'กำลังบันทึกและจัดสรรคิว...' : 'คำนวณและบันทึก'}
        </button>
      </div>

      {/* สรุปยอดรวม Live */}
      <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">1. ยอดรวมที่ได้จากการคำนวณ (Live)</div>
        <div className="grid grid-cols-4 xl:grid-cols-2 gap-1.5 sm:gap-2">
          {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => {
            const totalValue = positions[type].total
            return (
              <div key={`total-${type}`} className="flex flex-col items-center justify-center p-1.5 sm:p-2 xl:p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xs">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 xl:w-16 xl:h-16 bg-linear-to-b ${ITEM_CONFIG[type].color} rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center relative mb-1 xl:mb-2 shadow-inner`}>
                  <Image src={ITEM_CONFIG[type].icon} alt={ITEM_CONFIG[type].label} fill className="object-contain p-1" sizes="64px" />
                </div>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={totalValue === '' ? '' : totalValue}
                  onFocus={() => {
                    if (totalValue === 0) {
                      handleTotalChange(type, '')
                    }
                  }}
                  onChange={e => handleTotalChange(type, e.target.value)}
                  className={`w-full text-center text-sm sm:text-base xl:text-xl font-black font-mono ${typeof totalValue === 'number' && totalValue > 0 ? 'text-green-500 dark:text-green-400' : 'text-slate-300 dark:text-slate-600'} bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg p-1 xl:p-2 outline-none focus:border-blue-500`}
                />
                <span className="text-[10px] xl:text-xs text-slate-500 dark:text-slate-400 mt-0.5">ชิ้น</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">2. ระบุพิกัดจากหน้าต่างเกม</div>
        <div className="space-y-2.5 flex-1">
          {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
            <div key={`calc-${type}`} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center gap-1.5 mb-3 px-1">
                <div className={`w-12 h-12 bg-linear-to-b ${ITEM_CONFIG[type].color} rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center relative shadow-inner shrink-0`}>
                  <Image src={ITEM_CONFIG[type].icon} alt={ITEM_CONFIG[type].label} fill className="object-contain p-1" sizes="48px" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <input type="number" min={1} placeholder="หน้า" value={positions[type].startPage} onChange={e => handlePosChange(type, 'startPage', e.target.value)} className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-center outline-none focus:border-blue-500" />
                <input type="number" min={1} max={4} placeholder="ช่อง" value={positions[type].startSlot} onChange={e => handlePosChange(type, 'startSlot', e.target.value)} className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-center outline-none focus:border-blue-500" />
                <span className="text-slate-400 text-xs">➔</span>
                <input type="number" min={1} placeholder="หน้า" value={positions[type].endPage} onChange={e => handlePosChange(type, 'endPage', e.target.value)} className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-center outline-none focus:border-blue-500" />
                <input type="number" min={1} max={4} placeholder="ช่อง" value={positions[type].endSlot} onChange={e => handlePosChange(type, 'endSlot', e.target.value)} className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded text-[10px] text-center outline-none focus:border-blue-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}