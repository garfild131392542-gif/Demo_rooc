'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import { sendContactEmail } from '@/app/actions/contact' // นำเข้าฟังก์ชันส่งเมล
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // State สำหรับหน้าต่างติดต่อแอดมิน
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // ส่ง Username แทน Email
      const result = await loginAction(username, password)

      if (!result.success) {
        setError(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        setLoading(false)
        return
      }

      const pushed = await router.push('/')
      if (!pushed) {
        window.location.href = '/'
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก โปรดลองอีกครั้ง')
      setLoading(false)
    }
  }

  // ฟังก์ชันจัดการฟอร์มติดต่อแอดมิน
  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setContactStatus('loading')
    const formData = new FormData(e.currentTarget)
    
    const result = await sendContactEmail(formData)
    
    if (result.success) {
      setContactStatus('success')
      // ปิดหน้าต่างอัตโนมัติหลังจากส่งสำเร็จ 2 วินาที
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
              ROOC GUILD
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              ลงชื่อเข้าสู่ระบบเพื่อจัดการข้อมูล
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 p-4 shadow-sm border border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400 text-center">
                  {error}
                </h3>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  ชื่อผู้ใช้งาน (Username)
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="กรอกชื่อผู้ใช้งานของคุณ"
                />
              </div>

              <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน</label>
    
    <div className="relative">
      <input 
        id="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type={showPassword ? "text" : "password"} 
        required 
        className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" 
      />
      
      {/* ปุ่มกดสลับเปิด-ปิดตา จัดตำแหน่งขวากลาง */}
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        {showPassword ? (
          // ไอคอน "ดวงตาโดนขีดฆ่า" (แสดงเมื่อสั่งให้เปิดเผยรหัสผ่านอยู่ -> กดแล้วจะซ่อน)
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          // ไอคอน "ดวงตาปกติ" (แสดงเมื่อสั่งให้ซ่อนรหัสผ่านอยู่ -> กดแล้วจะแสดง)
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
              className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 transition-colors shadow-md"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>

            {/* ส่วนติดต่อแอดมิน */}
            <div className="mt-4 flex flex-col items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ยังไม่มีบัญชีใช่ไหม?{' '}
                <Link href="/register" className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-colors">
                  สมัครสมาชิกที่นี่
                </Link>
              </p>
              {/* ปุ่มเปิดหน้าต่างติดต่อแอดมิน */}
              <button 
                type="button"
                onClick={() => setShowContactModal(true)}
                className="cursor-pointer text-sm text-slate-500 font-medium hover:text-slate-800 underline decoration-slate-300 transition-colors"
              >
                พบปัญหาในการใช้งาน? ติดต่อผู้ดูแลระบบ
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ต้องการสร้างกิลด์ใหม่?{' '}
              <a href="/guild/create" className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-colors">
                สร้างกิลด์ที่นี่
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* หน้าต่าง (Modal) สำหรับติดต่อแอดมิน */}
      {showContactModal && (
        <div className=" fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">ติดต่อแอดมิน</h3>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมลที่สามารถติดต่อได้
                </label>
                <input
                  name="contactEmail"
                  type="email"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="เช่น your_email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รายละเอียดปัญหาที่พบ
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                  placeholder="อธิบายปัญหาที่คุณพบ..."
                ></textarea>
              </div>

              {/* ข้อความแจ้งเตือนสถานะ */}
              {contactStatus === 'success' && <p className="text-green-600 text-sm font-bold text-center">ส่งข้อความสำเร็จ! แอดมินจะติดต่อกลับไปครับ</p>}
              {contactStatus === 'error' && <p className="text-red-600 text-sm font-bold text-center">เกิดข้อผิดพลาดในการส่งข้อความ</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-70"
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