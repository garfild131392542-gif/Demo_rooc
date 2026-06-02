'use client'

import { renewSubscriptionAction } from '@/app/actions/billing'
import { useTransition } from 'react'

export default function BillingPage() {
  const [isPending, startTransition] = useTransition()

  const handlePayment = () => {
    startTransition(() => {
      renewSubscriptionAction()
    })
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            ระยะเวลาทดลองใช้งาน
          </h1>
          <p className="text-xl text-red-400 font-semibold">
            ระยะเวลาทดลองใช้งาน 14 วันของกิลด์คุณหมดอายุแล้ว
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
          {/* Card Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 px-8 py-8">
            <h2 className="text-3xl font-bold text-white mb-2">PRO Plan</h2>
            <p className="text-blue-100">สำหรับการจัดการกิลด์ขั้นสูง</p>
          </div>

          {/* Card Content */}
          <div className="px-8 py-8">
            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">199</span>
                <span className="text-2xl text-gray-600">บาท</span>
                <span className="text-lg text-gray-500">/ เดือน</span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                สิ่งที่รวมอยู่:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">ไม่จำกัดจำนวนสมาชิก</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">ประวัติสมาชิกแบบเต็ม</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">รายงานและวิเคราะห์ขั้นสูง</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">ลำดับความสำคัญที่จัดการปาร์ตี้</span>
                </li>
              </ul>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isPending}
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 text-lg"
            >
              {isPending ? 'กำลังดำเนินการ...' : 'ชำระเงิน (Simulate Payment)'}
            </button>

            {/* Disclaimer */}
            <p className="text-center text-gray-500 text-sm mt-4">
              นี่คือการจำลองการชำระเงิน หลังจากคลิก คุณจะได้รับการต่ออายุ 30 วัน
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-gray-300 mb-4">
            คำถามอื่น ๆ? ติดต่อการสนับสนุนของเรา
          </p>
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            กลับไปที่แดชบอร์ด
          </a>
        </div>
      </div>
    </div>
  )
}
