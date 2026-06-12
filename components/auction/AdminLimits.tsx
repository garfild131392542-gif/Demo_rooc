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
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400">ลิมิตประมูลต่อคน</span>
      </h3>
      
      <div className="grid grid-cols-4 gap-1">
        {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
          <div key={`limit-${type}`} className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm transition-colors">
            <div className={`w-14 h-14 bg-linear-to-b ${ITEM_CONFIG[type].color} rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center relative mb-3 shadow-inner`}>
              <Image src={ITEM_CONFIG[type].icon} alt={ITEM_CONFIG[type].label} fill className="object-contain p-1" sizes="64px" />
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
              className="w-full text-center text-xl font-black font-mono bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-500 text-blue-600 dark:text-blue-400"
            />
          </div>
        ))}
      </div>
    </div>
  )
}