'use client'

import { useState, useEffect } from 'react'

export default function UpdateTicker() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('update-ticker-dismissed')
    if (!isDismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('update-ticker-dismissed', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  const announcementText = "📢 อัปเดตใหม่ล่าสุด: ปรับลดราคาแพ็กเกจเป็น 259 บาท/30 วัน | เปิดให้ใช้งานระบบจัดทีมปาร์ตี้ หน้าข้อมูลส่วนตัว และบอร์ดกิลด์ฟรี! (จำกัดสิทธิ์เฉพาะส่วนการประมูลหากยังไม่ได้ชำระเงิน) | เชื่อมต่อบอต Discord ได้ปกติแล้ววันนี้!"

  return (
    <div className="relative w-full h-8 overflow-hidden bg-linear-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 dark:from-blue-950/20 dark:via-slate-900/40 dark:to-blue-950/20 border-b border-blue-500/10 dark:border-blue-900/30 flex items-center z-[90]">
      {/* Scrollable Area */}
      <div className="flex-1 overflow-hidden h-full flex items-center pr-10">
        <div className="animate-ticker-marquee whitespace-nowrap text-xs font-semibold text-blue-800 dark:text-blue-200">
          <span className="inline-block mx-28">{announcementText}</span>
          <span className="inline-block mx-28">{announcementText}</span>
          <span className="inline-block mx-28">{announcementText}</span>
          <span className="inline-block mx-28">{announcementText}</span>
        </div>
      </div>
      
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-500/10 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/20 transition-colors z-[91] cursor-pointer"
        aria-label="Close Announcement"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
