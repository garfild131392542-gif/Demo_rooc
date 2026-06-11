'use client'

import type { Dispatch, SetStateAction } from 'react'
import Image from 'next/image'
import { ITEM_CONFIG } from './constants'

type LimitType = keyof typeof ITEM_CONFIG
type LimitValue = number | ''

type AdminLimitsProps = {
  limits: Record<LimitType, LimitValue>
  setLimits: Dispatch<SetStateAction<Record<LimitType, LimitValue>>>
}

export default function AdminLimits({ limits, setLimits }: AdminLimitsProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400">ลิมิตประมูลต่อคน</span>
      </h3>
      
      <div className="space-y-3">
        {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
          <div key={`limit-${type}`} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 relative shrink-0">
                <Image src={ITEM_CONFIG[type].icon} alt={ITEM_CONFIG[type].label} fill className="object-contain" />
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">{ITEM_CONFIG[type].label}</span>
            </div>
            <input
              type="number"
              min={1}
              value={limits[type] ?? ''}
              onChange={e => {
                const value = e.target.value
                setLimits(p => ({
                  ...p,
                  [type]: value === '' ? '' : parseInt(value) || 1,
                }))
              }}
              className="w-14 p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-center font-black text-blue-600 dark:text-blue-400 outline-none focus:border-blue-500 shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  )
}