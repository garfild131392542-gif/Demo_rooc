'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGuildOnboardingAction } from '@/app/actions/onboarding'

const GUILD_URL_REGEX = /^[a-z0-9-]+$/

export default function OnboardingPage() {
  const router = useRouter()
  const [guildName, setGuildName] = useState('')
  const [serverName, setServerName] = useState('')
  const [guildUrl, setGuildUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const normalizedGuildName = guildName.trim()
    const normalizedServerName = serverName.trim()
    const normalizedGuildUrl = guildUrl.trim()

    if (!normalizedGuildName) {
      setError('กรุณากรอกชื่อกิลด์')
      return
    }
    if (!normalizedServerName) {
      setError('กรุณากรอกชื่อเซิร์ฟเวอร์')
      return
    }
    if (!normalizedGuildUrl || !GUILD_URL_REGEX.test(normalizedGuildUrl)) {
      setError('กรุณากรอก URL ที่ถูกต้อง (a-z, 0-9 และ - เท่านั้น)')
      return
    }

    setLoading(true)
    try {
      const result = await createGuildOnboardingAction(
        normalizedGuildName,
        normalizedServerName,
        normalizedGuildUrl,
      )

      if (!result?.success) {
        setError(result?.error || 'เกิดข้อผิดพลาดในการสร้างกิลด์')
        setLoading(false)
        return
      }

      // Success! Redirect to dashboard
      router.push('/')
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการสร้างกิลด์')
      setLoading(false)
    }
  }

  return (
    <div className="w-full mt-10 max-w-lg mx-auto px-4">
      <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-blue-600">สร้างกิลด์ของคุณ</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          ป้อนข้อมูลเพื่อสร้างกิลด์และตั้งค่า URL แบบกำหนดเอง
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 shadow-sm border border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400 text-center">
                {error}
              </h3>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Guild Name
            </label>
            <input
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="เช่น ROOC Alpha"
              required
              name="guildName"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Server Name
            </label>
            <input
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="เช่น Universe"
              required
              name="serverName"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Guild URL
            </label>
            <input
              value={guildUrl}
              onChange={(e) => setGuildUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="เช่น rooc-alpha"
              required
              name="guildUrl"
              inputMode="text"
              autoCapitalize="none"
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              อนุญาตเฉพาะ a-z, 0-9 และ hyphen (-) เท่านั้น (ต้องเป็นตัวพิมพ์เล็ก)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-colors shadow-md"
          >
            {loading ? 'กำลังสร้างกิลด์...' : 'สร้างกิลด์'}
          </button>
        </form>
      </div>
    </div>
  )
}

