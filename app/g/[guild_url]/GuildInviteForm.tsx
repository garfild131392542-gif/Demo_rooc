'use client'

import { useState } from 'react'
import { registerMemberWithGuildInvite } from '@/app/actions/guild-invite'

type Props = {
  guildId: string
  guildName: string
  serverName: string
}

export default function GuildInviteForm({ guildId, guildName, serverName }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [jobName, setJobName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await registerMemberWithGuildInvite(
        guildId,
        username,
        password,
        displayName,
        jobName,
      )

      if (!result?.success) {
        setError(result?.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        สมัครสมาชิกเพื่อเข้าร่วมกิลด์
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mt-2">
        กิลด์: <span className="font-bold">{guildName}</span> | เซิร์ฟเวอร์:{' '}
        <span className="font-bold">{serverName}</span>
      </p>

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 p-4 shadow-sm border border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-400 text-center">
            {error}
          </h3>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            name="username"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="กรอก username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            name="password"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="กรอกรหัสผ่าน"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Display Name (ชื่อตัวละคร)
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            name="displayName"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="กรอกชื่อตัวละคร"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job Name (อาชีพ)
          </label>
          <input
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            required
            name="jobName"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="กรอกอาชีพ"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-colors shadow-md"
        >
          {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>
      </form>
    </div>
  )
}

