'use client'

import { Dispatch, SetStateAction } from 'react'


type AuctionItemType = 'Album' | 'Puppet' | 'White' | 'RedBlack'

type MemberFormProps = {
  reservationQtys: Record<AuctionItemType, string>
  setReservationQtys: Dispatch<SetStateAction<Record<AuctionItemType, string>>>
  handleMemberRegisterSingle: (itemType: AuctionItemType, qty: number) => void
  submittingItem: AuctionItemType | null
}

export default function MemberForm({ 
  reservationQtys, 
  setReservationQtys, 
  handleMemberRegisterSingle, 
  submittingItem 
}: MemberFormProps) {
  const itemTypes = [
    { key: 'Album', label: 'สมุดการ์ด' },
    { key: 'Puppet', label : 'เศษการ์ดบอส' },
    { key: 'White', label: 'ขนขาว' },
    { key: 'RedBlack', label: 'ขนดำแดง' },
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
          {itemTypes.map((item) => {
            const hasQtyValue = reservationQtys[item.key] !== '' && reservationQtys[item.key] !== undefined;
            const isItemSubmitting = submittingItem === item.key;
            return (
              <div key={item.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 transition-colors hover:border-blue-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200 w-28 shrink-0">{item.label}</span>
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
                <button
                  type="button"
                  disabled={submittingItem !== null || !hasQtyValue}
                  onClick={() => handleMemberRegisterSingle(item.key, parseInt(reservationQtys[item.key] || '0', 10))}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 min-w-[76px]"
                >
                  {isItemSubmitting ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      <span>จอง...</span>
                    </>
                  ) : (
                    <span>จองคิว</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-505 dark:text-slate-400 leading-relaxed">
          กรอกจำนวนที่ต้องการและกดปุ่ม <strong>"จองคิว"</strong> ด้านขวาของไอเทมนั้น ๆ โดยแต่ละประเภทจองได้ไม่เกิน 10 ชิ้น ระบบจะจองเฉพาะไอเทมที่คุณกด โดยไม่ส่งผลกระทบต่อไอเทมประเภทอื่น ๆ ที่เคยจองไว้ก่อนหน้านี้
        </p>
      </div>
    </div>
  )
}