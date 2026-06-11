'use client'

import { renewSubscriptionAction } from '@/app/actions/billing'
import { useTransition } from 'react'

export default function BillingPage() {
  const [isPending, startTransition] = useTransition()

  const handlePayment = () => {
    startTransition(() => {
      // 💡 ฟังก์ชันจำลองการต่ออายุหลังบ้าน (กดแล้วอาจจะบวกเพิ่ม 14 หรือ 30 วันตามที่เขียนไว้ใน Action)
      renewSubscriptionAction()
    })
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ปลดล็อกระบบกิลด์ขั้นสุด 🚀
          </h1>
          <p className="text-xl text-blue-300 font-medium">
            เริ่มต้นใช้งานระดับ PRO วันนี้ โดยไม่มีค่าใช้จ่ายแอบแฝง
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8 transform transition-all hover:scale-[1.01] duration-300">
          
          {/* Card Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 px-8 py-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
              Limited Time Offer
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">PRO Plan (Free Trial)</h2>
            <p className="text-blue-100">ทดลองใช้งานฟีเจอร์จัดการกิลด์แบบเต็มรูปแบบ</p>
          </div>

          {/* Card Content */}
          <div className="px-8 py-8">
            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-gray-900">ฟรี</span>
                <span className="text-2xl text-gray-600">14 วัน</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">ไม่ต้องใช้บัตรเครดิต ไม่มีข้อผูกมัดใดๆ</p>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">
                สิทธิพิเศษที่คุณจะได้รับ:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="bg-green-100 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">เพิ่มสมาชิกกิลด์ได้ไม่จำกัดจำนวน</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-green-100 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">ระบบจัดคิวประมูลและ Slot อัตโนมัติ</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="bg-green-100 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">เข้าถึงข้อมูลและสถิติเชิงลึกของลูกกิลด์</span>
                </li>
              </ul>
            </div>

            {/* Trial Button */}
            <button
              onClick={handlePayment}
              disabled={isPending}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 text-lg shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังเปิดใช้งาน...
                </>
              ) : (
                '✨ เริ่มต้นทดลองใช้งานฟรีทันที'
              )}
            </button>

            {/* Disclaimer */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-5">
              <p className="text-center text-slate-500 text-xs leading-relaxed">
                นี่คือระบบจำลองการเปิดใช้งาน (Development Phase)<br />
                เมื่อกดปุ่ม ระบบจะอัปเดตสิทธิ์กิลด์ของคุณเป็นระดับ PRO อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <p className="text-slate-400 mb-2 text-sm">
            ต้องการกลับไปดูภาพรวมก่อนไหม?
          </p>
          <a
            href="/"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium transition-colors gap-1"
          >
            <span>&larr;</span> กลับไปที่แดชบอร์ดหลัก
          </a>
        </div>
      </div>
    </div>
  )
}