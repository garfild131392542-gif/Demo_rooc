'use client'

import { ITEM_CONFIG } from './constants'

export default function AdminForm({ positions, setPositions, onSave, isSaving }: any) {
  
  // 🌟 ฟังก์ชันคำนวณสดทันทีที่พิมพ์ (Real-time Calculation)
  const handlePosChange = (type: string, field: string, val: string) => {
    setPositions((prev: any) => {
      const updated = { ...prev[type], [field]: val }
      const sp = parseInt(updated.startPage), ss = parseInt(updated.startSlot)
      const ep = parseInt(updated.endPage), es = parseInt(updated.endSlot)

      if (!isNaN(sp) && !isNaN(ss) && !isNaN(ep) && !isNaN(es)) {
        if (ep > sp || (ep === sp && es >= ss)) {
          updated.total = ((ep - sp) * 4) + (es - ss) + 1
        } else {
          updated.total = 0 // ถ้าพิกัดผิด (เช่น หน้าจบ น้อยกว่า หน้าเริ่ม) ยอดเป็น 0
        }
      } else {
        updated.total = 0 // ถ้าลบข้อมูลออก ยอดเป็น 0
      }
      return { ...prev, [type]: updated }
    })
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors h-full flex flex-col">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400">🧮 เครื่องมือคำนวณพิกัดเกม</span>
      </h3>

      {/* สรุปยอดรวม Live */}
      <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">1. ยอดรวมที่ได้จากการคำนวณ (Live)</div>
        <div className="grid grid-cols-2 gap-2">
          {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
            <div key={`total-${type}`} className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm">
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-1 truncate w-full text-center">{ITEM_CONFIG[type].label}</span>
              <span className={`text-xl font-black font-mono ${positions[type].total > 0 ? 'text-green-500 dark:text-green-400' : 'text-slate-300 dark:text-slate-600'}`}>
                {positions[type].total} <span className="text-xs font-normal">ชิ้น</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">2. ระบุพิกัดจากหน้าต่างเกม</div>
        <div className="space-y-2.5 flex-1">
          {(['Album', 'Puppet', 'White', 'RedBlack'] as const).map(type => (
            <div key={`calc-${type}`} className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-sm">{ITEM_CONFIG[type].icon}</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{ITEM_CONFIG[type].label}</span>
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

        <div className="mt-4">
          <button onClick={onSave} disabled={isSaving} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-md">
            {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกตารางประมูลเข้าเซิร์ฟเวอร์'}
          </button>
        </div>
      </div>
    </div>
  )
}