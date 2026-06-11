'use client'

import { ITEM_CONFIG } from './constants'

export default function AdminLimits({ limits, setLimits }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400">👑 ลิมิตประมูล (Limits)</span>
      </h3>
      
      <div className="space-y-3">
        {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
          <div key={`limit-${type}`} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl shrink-0">{ITEM_CONFIG[type].icon}</span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">{ITEM_CONFIG[type].label}</span>
            </div>
            <input 
              type="number" min={1} value={limits[type]} 
              onChange={e => setLimits((p: any) => ({...p, [type]: parseInt(e.target.value) || 1}))}
              className="w-14 p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-sm text-center font-black text-blue-600 dark:text-blue-400 outline-none focus:border-blue-500 shrink-0" 
            />
          </div>
        ))}
      </div>
    </div>
  )
}