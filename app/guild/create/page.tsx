'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createNewGuild } from '@/app/actions/guild'

export default function CreateGuildPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const result = await createNewGuild(formData)

    if (!result.success) {
      setError(result.error ?? 'เกิดข้อผิดพลาดระหว่างสร้างกิลด์')
      setIsLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">สร้างกิลด์ใหม่</h1>
        <p className="text-sm text-slate-500 mb-6">สร้างกิลด์ในระบบ Approval โดยแยกจากขั้นตอนสมัครสมาชิก</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อกิลด์</label>
            <input
              name="guildName"
              type="text"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อเซิร์ฟเวอร์</label>
            <select
              name="serverName"
              required
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Prontera-1">Prontera-1</option>
              <option value="Prontera-2">Prontera-2</option>
              <option value="Prontera-3">Prontera-3</option>
              <option value="Prontera-4">Prontera-4</option>
              <option value="Prontera-5">Prontera-5</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'กำลังสร้าง...' : 'สร้างกิลด์ใหม่'}
          </button>
        </form>
      </div>
    </div>
  )
}
