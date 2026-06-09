'use client'

import { useState , useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction ,forgotPasswordAction } from '@/app/actions/auth'
import { sendContactEmail } from '@/app/actions/contact'
import Link from 'next/link'
import Image from 'next/image'

// 🌟 1. Import reCAPTCHA
import ReCAPTCHA from "react-google-recaptcha"

export default function LoginPage() {
  const router = useRouter()
  const recaptchaRef = useRef<any>(null)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // ==========================================
  // 🌟 State สำหรับ Modal รีเซ็ตรหัสผ่าน (แบบตรวจสอบรหัสกิลด์)
  // ==========================================
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotInviteCode, setForgotInviteCode] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)

  const [showContactModal, setShowContactModal] = useState(false)
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // State สำหรับเก็บค่า Token จาก CAPTCHA
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  // 🌟 ฟังก์ชันจัดการตอนกดส่งขอรีเซ็ตรหัสผ่าน
  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setForgotError(null)
    setForgotSuccess(null)
    setForgotLoading(true)

    try {
      // โยนข้อมูล 3 ตัวไปให้ Backend ตรวจสอบ
      const result = await forgotPasswordAction({
        username: forgotUsername,
        inviteCode: forgotInviteCode,
        newPassword: forgotNewPassword
      })

      if (!result.success) {
        setForgotError(result.error || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง')
      } else {
        setForgotSuccess('เปลี่ยนรหัสผ่านสำเร็จ! คุณสามารถเข้าสู่ระบบด้วยรหัสใหม่ได้ทันที')
        // ล้างฟอร์ม
        setForgotUsername('')
        setForgotInviteCode('')
        setForgotNewPassword('')
      }
    } catch (err: any) {
      setForgotError(err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก')
    } finally {
      setForgotLoading(false)
    }
  }

  // ฟังก์ชันล็อกอิน
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // สั่งให้ Invisible reCAPTCHA ทำงานเบื้องหลัง
      const token = await recaptchaRef.current.executeAsync()
      
      if (!token) {
        setError('การยืนยันตัวตนล้มเหลว โปรดลองอีกครั้ง')
        setLoading(false)
        return
      }

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

  // ฟังก์ชันติดต่อแอดมิน
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
      <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-end w-full overflow-hidden bg-gray-950">
        
        {/* เลเยอร์ 0: รูปภาพพื้นหลัง */}
        <div className="absolute inset-0 z-0 animate-in fade-in duration-[1500ms] ease-out">
          <Image
            src="/login.png"
            alt="Epic Fantasy Guild Background"
            fill
            priority
            quality={95}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 z-10 bg-black/30 dark:bg-black/50 mix-blend-multiply animate-in fade-in duration-[1500ms]" />

        {/* ข้อความฝั่งซ้าย */}
        <div className="relative z-20 hidden lg:flex flex-col flex-1 p-12 text-left self-center animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">ROOC GUILD<br />MANAGEMENT</h1>
          <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">ระบบบริหารจัดการและจัดระเบียบกิลด์ของคุณให้แข็งแกร่ง พร้อมลุยทุกสถานการณ์</p>
        </div>

        {/* ฝั่งขวา: ฟอร์ม Login */}
        <div className="relative z-20 w-full lg:w-[40%] min-h-screen flex items-center justify-center lg:justify-end px-6 py-12 sm:px-12 lg:px-16 xl:px-20 animate-in fade-in slide-in-from-right-16 duration-800 ease-out">
          <div className="w-full max-w-sm p-8 bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl">
            <div className="text-center lg:text-left mb-6">
              <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">ยินดีต้อนรับกลับมา</h2>
              <p className="mt-2 text-sm text-blue-100/80">ลงชื่อเข้าสู่ระบบเพื่อจัดการข้อมูลกิลด์ของคุณ</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-500/20 p-4 border border-red-500/30 backdrop-blur-md">
                  <p className="text-sm font-medium text-red-200 text-center">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">ชื่อผู้ใช้งาน</label>
                  <input id="identifier" type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm" placeholder="Username" autoCapitalize="none" spellCheck={false} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white uppercase tracking-wider mb-2">รหัสผ่าน</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none p-1 text-xs font-bold">{showPassword ? "ซ่อน" : "แสดง"}</button>
                  </div>
                </div>
                
                {/* ปุ่มเปิด Modal ลืมรหัสผ่าน */}
                <div className="flex justify-end mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true)
                      setForgotError(null)
                      setForgotSuccess(null)
                    }} 
                    className="cursor-pointer text-xs font-medium text-blue-300 hover:text-white transition-colors underline decoration-blue-300/30 hover:decoration-white"
                  >
                    ลืมรหัสผ่านใช่ไหม?
                  </button>
                </div>
              </div>

              {/* Invisible reCAPTCHA - Hidden */}
              <div className="hidden">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey="6LdoDxUtAAAAAFCw0hxJQuNZhbeNBMFWbbK6zI3V"
                  size="invisible"
                />
              </div>

              <button type="submit" disabled={loading} className="group relative flex w-full justify-center rounded-xl bg-blue-600/80 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm">
                เข้าสู่ระบบ
              </button>
              
              <div className="mt-4 text-[10px] text-white/40 text-center px-4 leading-relaxed">
                This site is protected by reCAPTCHA and the Google <br className="hidden sm:block"/>
                <a href="https://policies.google.com/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</a> and <a href="https://policies.google.com/terms" className="hover:text-white/60 transition-colors">Terms of Service</a> apply.
              </div>

              <div className="mt-6 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-center">
                <p className="text-sm text-blue-100/90">ยังไม่มีบัญชีใช่ไหม? <Link href="/register" className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors">สมัครสมาชิกที่นี่</Link></p>
                <button type="button" onClick={() => setShowContactModal(true)} className="cursor-pointer text-xs text-white/60 font-medium hover:text-white underline decoration-white/20 transition-colors">พบปัญหาในการใช้งาน? ติดต่อผู้ดูแลระบบ</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* =======================
          5. Modal Loading (แสดงตอนกด Login)
          ======================= */}
      {loading && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col items-center bg-white/10 dark:bg-black/40 p-8 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-2xl">
            <svg className="h-14 w-14 animate-spin text-blue-500 mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="text-xl font-extrabold text-white tracking-widest drop-shadow-md">กำลังเข้าสู่ระบบ</h3>
            <p className="text-sm text-blue-200/80 mt-2">โปรดรอสักครู่ ระบบกำลังตรวจสอบข้อมูล...</p>
          </div>
        </div>
      )}

      {/* =======================
          🌟 6. Forgot Password Modal (แบบยืนยันรหัสเชิญกิลด์)
          ======================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-8 bg-white/10 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl relative">
            
            {/* ปุ่มปิดกากบาท */}
            <button 
              onClick={() => {
                setShowForgotModal(false)
                setForgotSuccess(null)
                setForgotError(null)
              }} 
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="text-center lg:text-left mb-6 mt-2">
              <h3 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">ตั้งรหัสผ่านใหม่</h3>
              <p className="mt-2 text-sm text-blue-100/80">ยืนยันตัวตนด้วยชื่อผู้ใช้งานและรหัสเชิญกิลด์</p>
            </div>

            {forgotSuccess ? (
              <div className="text-center space-y-4">
                <div className="rounded-xl bg-green-500/20 p-6 border border-green-500/30 backdrop-blur-md">
                  <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-bold text-green-200">{forgotSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 transition-all border border-white/20"
                >
                  กลับไปหน้าเข้าสู่ระบบ
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {forgotError && (
                  <div className="rounded-xl bg-red-500/20 p-4 border border-red-500/30 backdrop-blur-md">
                    <p className="text-sm font-medium text-red-200 text-center">{forgotError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="forgotUsername" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    ชื่อผู้ใช้งาน (Username)
                  </label>
                  <input
                    id="forgotUsername"
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                    placeholder="กรอกชื่อผู้ใช้งานของคุณ"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>

                <div>
                  <label htmlFor="forgotInviteCode" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    รหัสเชิญกิลด์ที่สังกัด
                  </label>
                  <input
                    id="forgotInviteCode"
                    type="text"
                    required
                    value={forgotInviteCode}
                    onChange={(e) => setForgotInviteCode(e.target.value)}
                    className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                    placeholder="เช่น ROOC-XYZ123"
                  />
                </div>

                <div>
                  <label htmlFor="forgotNewPassword" className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                    รหัสผ่านใหม่
                  </label>
                  <div className="relative">
                    <input
                      id="forgotNewPassword"
                      type={showForgotNewPassword ? "text" : "password"}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white focus:outline-none p-1 text-xs font-bold"
                    >
                      {showForgotNewPassword ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="group relative flex w-full justify-center rounded-xl bg-blue-600/80 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm mt-2"
                >
                  {forgotLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันและเปลี่ยนรหัสผ่าน'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}


      {/* =======================
          Contact Modal (สไตล์ Liquid-Glass)
          ======================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-8 bg-white/10 dark:bg-black/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl relative">
            
            {/* ปุ่มกากบาทปิด Modal */}
            <button 
              onClick={() => setShowContactModal(false)} 
              className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="text-center lg:text-left mb-6 mt-2">
              <h3 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-sm">ติดต่อแอดมิน</h3>
              <p className="mt-2 text-sm text-blue-100/80">พบปัญหาในการใช้งาน? แจ้งให้เราทราบได้เลย</p>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  อีเมลที่สามารถติดต่อได้
                </label>
                <input
                  name="contactEmail"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm"
                  placeholder="your_email@gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">
                  รายละเอียดปัญหาที่พบ
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="block w-full rounded-xl border border-white/20 px-4 py-3 text-white placeholder-white/40 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white/10 dark:bg-black/20 backdrop-blur-md transition-all sm:text-sm resize-none"
                  placeholder="อธิบายปัญหาที่คุณพบ..."
                ></textarea>
              </div>

              {contactStatus === 'success' && (
                <div className="rounded-xl bg-green-500/20 p-4 border border-green-500/30 backdrop-blur-md">
                  <p className="text-sm font-medium text-green-200 text-center">ส่งข้อความสำเร็จ! แอดมินจะติดต่อกลับไปครับ</p>
                </div>
              )}
              {contactStatus === 'error' && (
                <div className="rounded-xl bg-red-500/20 p-4 border border-red-500/30 backdrop-blur-md">
                  <p className="text-sm font-medium text-red-200 text-center">เกิดข้อผิดพลาดในการส่งข้อความ</p>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 focus:outline-none transition-all shadow-sm backdrop-blur-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={contactStatus === 'loading' || contactStatus === 'success'}
                  className="flex-1 group relative flex justify-center rounded-xl bg-blue-600/80 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70 transition-all shadow-lg backdrop-blur-sm"
                >
                  {contactStatus === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      กำลังส่ง...
                    </span>
                  ) : (
                    'ส่งข้อความ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}