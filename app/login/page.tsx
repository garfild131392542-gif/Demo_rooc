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
      setTimeout(() => { setShowContactModal(false); setContactStatus('idle') }, 2000)
    } else {
      setContactStatus('error')
    }
  }

  return (
    <>
      <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-end w-full overflow-hidden bg-gray-900">
        
        {/* =======================
            เลเยอร์ 0: รูปภาพพื้นหลัง 
            ======================= */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/login.jpg" // ⚠️ เปลี่ยนชื่อตรงนี้ให้ตรงกับชื่อไฟล์รูปในโฟลเดอร์ public ของคุณ
            alt="Epic Fantasy Guild Background"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        
        {/* =======================
            เลเยอร์ 1: แผ่น Overlay ดรอปแสงรูปภาพ 
            ======================= */}
        <div className="absolute inset-0 z-10 bg-black/40 dark:bg-black/60 mix-blend-multiply" />

        {/* =======================
            เลเยอร์ 2: คอนเทนต์ข้อความ (60%) และ ฟอร์ม (40%) 
            ======================= */}
        
        {/* ข้อความต้อนรับฝั่งซ้าย (60%) */}
        <div className="relative z-20 hidden lg:flex flex-col flex-1 p-12 text-left self-center">
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            ROOC GUILD<br />MANAGEMENT
          </h1>
          <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            ระบบบริหารจัดการและจัดระเบียบกิลด์ของคุณให้แข็งแกร่ง พร้อมลุยทุกสถานการณ์
          </p>
        </div>

        {/* แผงฟอร์มสไตล์ Liquid-Glass ฝั่งขวา (40%) */}
        <div className="relative z-20 w-full lg:w-[40%] min-h-screen flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white/10 dark:bg-black/30 backdrop-blur-xl border-l border-white/20 shadow-[-15px_0_50px_rgba(0,0,0,0.5)]">
          
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                ยินดีต้อนรับกลับมา
              </h2>
              <p className="mt-2 text-sm text-blue-100/90 drop-shadow-sm">
                ลงชื่อเข้าสู่ระบบเพื่อจัดการข้อมูลกิลด์ของคุณ
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {error && (
                <div className="rounded-xl bg-red-500/30 p-4 border border-red-500/50 backdrop-blur-md">
                  <p className="text-sm font-medium text-red-100 text-center">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="identifier" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
                    ชื่อผู้ใช้งาน หรือ อีเมล
                  </label>
                  <input
                    id="identifier" type="text" required
                    value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full rounded-xl border border-white/30 px-4 py-3 text-white placeholder-white/50 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                    placeholder="Username / Email" autoCapitalize="none" spellCheck={false}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 drop-shadow-sm">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input 
                      id="password" type={showPassword ? "text" : "password"} required 
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-white/30 px-4 py-3 text-white placeholder-white/50 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white focus:outline-none p-1 text-xs font-bold"
                    >
                      {showPassword ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="group relative flex w-full justify-center rounded-xl bg-blue-600/90 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign In'}
              </button>

              <div className="mt-6 flex flex-col items-center gap-4 border-t border-white/20 pt-6 text-center">
                <p className="text-sm text-blue-100/90 drop-shadow-sm">
                  ยังไม่มีบัญชีใช่ไหม?{' '}
                  <Link href="/register" className="font-bold text-blue-300 hover:text-white hover:underline transition-colors drop-shadow-sm">
                    สมัครสมาชิกที่นี่
                  </Link>
                </p>
                <button type="button" onClick={() => setShowContactModal(true)} className="cursor-pointer text-xs text-white/70 font-medium hover:text-white underline decoration-white/30 transition-colors">
                  พบปัญหาในการใช้งาน? ติดต่อผู้ดูแลระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Contact Modal (ซ่อนไว้ก่อน) */}
    </>
  )
}