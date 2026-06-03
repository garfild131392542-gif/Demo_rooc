'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TrialBannerProps {
  trialEndsAt: string
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const [daysRemaining, setDaysRemaining] = useState<number>(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date()
      const endDate = new Date(trialEndsAt)
      const diff = endDate.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      setDaysRemaining(Math.max(0, days))
    }

    calculateDays()
    const interval = setInterval(calculateDays, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [trialEndsAt])

  if (!isVisible || daysRemaining <= 0) {
    return null
  }

  return (
    <div className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="font-semibold">
          ทดลองใช้ฟรี 14 วัน - อัปเกรดเลยวันนี้!
        </p>
        <p className="text-sm text-purple-100">
          เหลือเวลาทดลองใช้งานอีก {daysRemaining} วัน
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/billing"
          className="bg-white text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          อัปเกรด
        </Link>
        <button
          onClick={() => setIsVisible(false)}
          className="text-purple-100 hover:text-white transition-colors"
          aria-label="Close banner"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
