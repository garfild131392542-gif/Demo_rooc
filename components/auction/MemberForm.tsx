'use client'

import { Dispatch, SetStateAction } from 'react'


type AuctionItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

type MemberFormProps = {
  reservationQtys: Record<AuctionItemType, string>
  setReservationQtys: Dispatch<SetStateAction<Record<AuctionItemType, string>>>
  handleMemberRegister: () => void
  isSaving: boolean
}

export default function MemberForm({ 
  reservationQtys, 
  setReservationQtys, 
  handleMemberRegister, 
  isSaving 
}: MemberFormProps) {
  const itemTypes = [
    { key: 'Album', label: 'สมุดการ์ด' },
    { key: 'Puppet', label : 'เศษการ์ดบอสปลอม' },
    { key: 'White', label: 'ขนนกขาว' },
    { key: 'RedBlack', label: 'ขนนกดำ/แดง' },
  ] as const

  const handleQtyFocus = (key: AuctionItemType) => {
    const currentValue = reservationQtys[key] ?? ''
    const normalized = currentValue.replace(/^0+/, '')
    if (normalized !== currentValue) {
      setReservationQtys(prev => ({ ...prev, [key]: normalized }))
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md transition-colors">
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">เลือกจำนวนไอเทม</h3>
      <div className="space-y-4">
        <div className="grid gap-3">
          {itemTypes.map((item) => (
            <label key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 transition-colors hover:border-blue-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200 w-50">{item.label}</span>
              <input
                type="number"
                min={0}
                max={10}
                value={reservationQtys[item.key]}
                onChange={(e) => setReservationQtys((prev) => ({ ...prev, [item.key]: e.target.value }))}
                onFocus={() => handleQtyFocus(item.key)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="จำนวน"
              />
            </label>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          กรอกจำนวนที่ต้องการสำหรับไอเทมแต่ละประเภท (ไม่เกิน 10 ชิ้นต่อประเภท) สามารถเลือกได้หลายรายการพร้อมกัน
        </p>

        <button 
          type="button" onClick={handleMemberRegister} disabled={isSaving} 
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSaving ? 'กำลังดำเนินการ...' : 'ลงทะเบียนจองประมูล'}
        </button>
      </div>
    </div>
  )
}