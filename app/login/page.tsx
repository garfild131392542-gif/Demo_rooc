'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import { sendContactEmail } from '@/app/actions/contact'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await loginAction(identifier, password)

      if (!result.success) {
        setError(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        setLoading(false)
        return
      }

      await router.push('/')
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก โปรดลองอีกครั้ง')
      setLoading(false)
    }
  }

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setContactStatus('loading')
    const formData = new FormData(e.currentTarget)
    
    const result = await sendContactEmail(formData)
    
    if (result.success) {
      setContactStatus('success')
      setTimeout(() => {
        setShowContactModal(false)
        setContactStatus('idle')
      }, 2000)
    } else {
      setContactStatus('error')
    }
  }

  return (
    <>
      <div className="flex min-h-screen bg-white dark:bg-gray-900">
        
        {/* =======================
            ฝั่งซ้าย: รูปภาพและ Typography (Split-Screen)
            ======================= */}
        <div className="relative hidden w-1/2 lg:block bg-gray-900">
          {/* 🌟 FIXED: เปลี่ยนมาใช้รูปภาพที่คุณเสนอมา (images (2).jpg) */}
          <Image
  src="/Rooc.jpg"
  alt="Epic Fantasy Guild Background"
  fill
  priority
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
          {/* Overlay ไล่สีให้ข้อความอ่านง่ายขึ้น */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-indigo-900/60 to-transparent mix-blend-multiply" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
              ROOC GUILD<br />MANAGEMENT
            </h1>
            <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-md">
              ระบบบริหารจัดการและจัดระเบียบกิลด์ของคุณให้แข็งแกร่ง พร้อมลุยทุกสถานการณ์
            </p>
          </div>
        </div>

        {/* =======================
            ฝั่งขวา: ฟอร์ม Login แบบมินิมอล
            ======================= */}
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                ยินดีต้อนรับกลับมา
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                ลงชื่อเข้าสู่ระบบเพื่อจัดการข้อมูลกิลด์ของคุณ
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* กล่องแสดง Error */}
              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 transition-all">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400 text-center">
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    ชื่อผู้ใช้งาน หรือ อีเมล
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white transition-colors"
                    placeholder="Username / Email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input 
                      id="password"
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-gray-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none p-1"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="mt-6 flex flex-col items-center gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ยังไม่มีบัญชีใช่ไหม?{' '}
                  <Link href="/register" className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-colors">
                    สมัครสมาชิกที่นี่
                  </Link>
                </p>
                <button 
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="cursor-pointer text-sm text-gray-500 font-medium hover:text-gray-800 dark:hover:text-gray-300 underline decoration-gray-300 dark:decoration-gray-600 transition-colors"
                >
                  พบปัญหาในการใช้งาน? ติดต่อผู้ดูแลระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* =======================
          Contact Modal (คงรูปแบบเดิมไว้ แต่ขอบมนขึ้นให้เข้ากับดีไซน์)
          ======================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">ติดต่อแอดมิน</h3>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none font-medium">&times;</button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  อีเมลที่สามารถติดต่อได้
                </label>
                <input
                  name="contactEmail"
                  type="email"
                  required
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="เช่น your_email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  รายละเอียดปัญหาที่พบ
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="อธิบายปัญหาที่คุณพบ..."
                ></textarea>
              </div>

              {contactStatus === 'success' && <p className="text-green-600 dark:text-green-400 text-sm font-bold text-center bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">ส่งข้อความสำเร็จ! แอดมินจะติดต่อกลับไปครับ</p>}
              {contactStatus === 'error' && <p className="text-red-600 dark:text-red-400 text-sm font-bold text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">เกิดข้อผิดพลาดในการส่งข้อความ</p>}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
              ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-70 transition-colors"
                >
                  {contactStatus === 'loading' ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}