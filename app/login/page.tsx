'use client'

import { useState, useEffect } from 'react'
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

  // 🌟 เพิ่ม State สำหรับจัดการ Animation
  const [isLoaded, setIsLoaded] = useState(false)
  

  // 🌟 สั่งให้ Animation ทำงานทันทีที่โหลดหน้าจอเสร็จ
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 50) // หน่วงเวลา 50 มิลลิวินาที ให้จอเรนเดอร์ค่า false ให้เสร็จก่อน

    return () => clearTimeout(timer) // Cleanup timer เมื่อเปลี่ยนหน้า
  }, [])

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
      <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-end w-full overflow-hidden bg-gray-950">
        
        {/* =======================
            เลเยอร์ 0: รูปภาพพื้นหลัง (มีเอฟเฟกต์ค่อยๆ ซูมออก)
            ======================= */}
        <div className={`absolute inset-0 z-0 transition-transform duration-[2s] ease-out ${isLoaded ? 'scale-100' : 'scale-110'}`}>
          <Image
            src="/login.jpg"
            alt="Epic Fantasy Guild Background"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        
        {/* เลเยอร์สีดรอปความสว่าง */}
        <div className={`absolute inset-0 bg-black/30 dark:bg-black/50 -z-10 mix-blend-multiply transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />

        {/* ข้อความต้อนรับฝั่งซ้าย (มีเอฟเฟกต์เลื่อนขึ้น) */}
        <div className={`hidden lg:flex flex-col flex-1 p-12 text-left z-10 self-center transition-all duration-1000 ease-out delay-300 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            ROOC GUILD<br />MANAGEMENT
          </h1>
          <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            ระบบบริหารจัดการและจัดระเบียบกิลด์ของคุณให้แข็งแกร่ง พร้อมลุยทุกสถานการณ์
          </p>
        </div>

        {/* =======================
            ฝั่งขวา: แผงควบคุมฟอร์มสไตล์ Liquid-Glass (มีเอฟเฟกต์เลื่อนเข้ามาจากขวา)
            ======================= */}
        <div className={`w-full lg:w-[40%] min-h-screen z-20 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white/10 dark:bg-black/30 backdrop-blur-xl lg:backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-white/20 dark:border-white/10 shadow-[-15px_0_50px_rgba(0,0,0,0.3)] transition-all duration-[800ms] ease-out transform ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
          
          <div className="w-full max-w-sm mx-auto">
            
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                ยินดีต้อนรับกลับมา
              </h2>
              <p className="mt-2 text-sm text-blue-100/80">
                ลงชื่อเข้าสู่ระบบเพื่อจัดการข้อมูลกิลด์ของคุณ
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* ... โค้ดฟอร์ม Login ทั้งหมดคงเดิม ไม่มีการเปลี่ยนแปลง ... */}
              {error && (
                <div className="rounded-xl bg-red-500/20 p-4 border border-red-500/30 backdrop-blur-md">
                  <p className="text-sm font-medium text-red-200 text-center">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="identifier" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">ชื่อผู้ใช้งาน หรือ อีเมล</label>
                  <input
                    id="identifier" type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                    placeholder="Username / Email" autoCapitalize="none" spellCheck={false}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">รหัสผ่าน</label>
                  <div className="relative">
                    <input 
                      id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none p-1 text-xs font-bold">
                      {showPassword ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-xl bg-blue-600/80 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm">
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign In'}
              </button>

              <div className="mt-6 flex flex-col items-center gap-4 border-t border-white/10 pt-6 text-center">
                <p className="text-sm text-blue-100/90">
                  ยังไม่มีบัญชีใช่ไหม?{' '}
                  <Link href="/register" className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                    สมัครสมาชิกที่นี่
                  </Link>
                </p>
                <button type="button" onClick={() => setShowContactModal(true)} className="cursor-pointer text-xs text-white/60 font-medium hover:text-white underline decoration-white/20 transition-colors">
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
  