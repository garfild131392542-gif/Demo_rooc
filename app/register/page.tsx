'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAction } from '@/app/actions/auth' 
import Link from 'next/link'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const result = await registerAction(email, password)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      router.push('/login?message=สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-sky-100 dark:border-gray-700">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">ROOC GUILD</h2>
          <p className="text-slate-500 dark:text-gray-400 mt-2">สร้างบัญชีใหม่เพื่อเข้าใช้งาน</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">อีเมล (Email)</label>
            <input 
              name="email" 
              type="email" 
              required 
              placeholder="your@email.com" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-white" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">รหัสผ่าน</label>
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                required 
                minLength={6}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-white" 
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="cursor-pointer w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </button>

          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              มีบัญชีแล้วใช่ไหม?{' '}
              <Link href="/login" className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-colors">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}