'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPasswordAction } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const result = await forgotPasswordAction(identifier)

    if (!result.success) {
      setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
      setLoading(false)
      return
    }

    setSuccess(result.message || `ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${result.email}`)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">รีเซ็ตรหัสผ่าน</h1>
          <p className="mt-3 text-sm text-slate-300">กรอกชื่อผู้ใช้งานหรืออีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-100">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="block text-sm font-semibold text-slate-100 mb-2">
              ชื่อผู้ใช้งานหรืออีเมล
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              placeholder="username หรือ email"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'กำลังส่งคำขอ...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
          </button>

          <p className="text-xs text-slate-400 leading-relaxed">
            หากคุณใช้ชื่อผู้ใช้งาน ระบบจะพยายามส่งลิงก์ไปยังอีเมลที่ใช้สมัคร หากไม่พบหรือไม่ได้รับอีเมล กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </form>

        <div className="mt-6 text-center text-sm text-slate-300">
          <Link href="/login" className="font-semibold text-blue-300 hover:text-blue-200 underline">
            กลับไปหน้าลงชื่อเข้าใช้
          </Link>
        </div>
      </div>
    </div>
  )
}
