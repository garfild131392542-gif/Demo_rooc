'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/FormInput'
import { FormTextarea } from '@/components/FormTextarea'
import { ProgressBar } from '@/components/ProgressBar'
import { completeOnboardingAction, validateGuildUrlAction } from '../actions/onboarding'

interface GuildUrlStatus {
  checking: boolean
  available: boolean | null
  error?: string
}

export function OnboardingForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [guildUrlStatus, setGuildUrlStatus] = useState<GuildUrlStatus>({
    checking: false,
    available: null,
  })

  // 🌟 1. เพิ่ม contactEmail เข้าไปในโครงสร้างสถานะข้อมูลของฟอร์ม
  const [formData, setFormData] = useState({
    guildName: '',
    guildUrl: '',
    guildDescription: '',
    discordLink: '',
    facebookLink: '',
    contactEmail: '', 
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const validateGuildUrl = useCallback(
    async (url: string) => {
      if (!url || url.length < 3) {
        setGuildUrlStatus({ checking: false, available: null })
        return
      }

      setGuildUrlStatus({ checking: true, available: null })

      const result = await validateGuildUrlAction(url)
      setGuildUrlStatus({
        checking: false,
        available: result.available,
        error: result.error,
      })
    },
    []
  )

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleGuildUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setFormData((prev) => ({ ...prev, guildUrl: value }))

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      validateGuildUrl(value)
    }, 500)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.guildName.trim()) {
        setError('กรุณากรอกชื่อกิลด์')
        return
      }
      if (!formData.guildUrl.trim()) {
        setError('กรุณาตั้งค่าความปลอดภัยลิงก์กิลด์ (URL)')
        return
      }
      if (!guildUrlStatus.available) {
        setError('ลิงก์กิลด์ (URL) นี้ถูกใช้งานไปแล้ว')
        return
      }
    } else if (currentStep === 2) {
      // 🌟 ตรวจเช็คความถูกต้องของอีเมลติดต่อในสเต็ปที่ 2
      if (!formData.contactEmail.trim()) {
        setError('กรุณากรอกอีเมลติดต่อจริง')
        return
      }
      if (!formData.contactEmail.includes('@')) {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
        return
      }
    }

    setCurrentStep(currentStep + 1)
    setError(null)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (currentStep !== 3) return

    setIsLoading(true)
    setError(null)

    // 🌟 2. ส่งข้อมูลอีเมลจริงข้ามไปบันทึกผ่าน Server Action
    const result = await completeOnboardingAction({
      guildName: formData.guildName,
      guildUrl: formData.guildUrl,
      guildDescription: formData.guildDescription,
      discordLink: formData.discordLink || undefined,
      contactEmail: formData.contactEmail.trim(), 
    })

    if (!result.success) {
      setError(result.error || 'เกิดข้อผิดพลาดในการสร้างระบบกิลด์')
      setIsLoading(false)
      return
    }

    setInviteLink(result.inviteLink || `${appUrl}/g/${formData.guildUrl}`)
  }

  const handleCopyInviteLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleGoToRegister = () => {
    router.refresh();
    router.push('/')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-slate-100 dark:border-gray-700/60 shadow-inner">
        <ProgressBar currentStep={currentStep} totalSteps={3} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 animate-in fade-in duration-200 text-center font-medium">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* STEP 1: Guild Info */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-5 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm animate-in fade-in duration-300">
          <FormInput
            label="ชื่อกิลด์ (Guild Name)"
            name="guildName"
            placeholder="เช่น: My Awesome Guild"
            value={formData.guildName}
            onChange={handleInputChange}
            required
          />

          {/* 🌟 ปรับแต่ง UI ส่วนของ URL Prefix ให้รวมชิ้นเดียวกันสวยงามและ Scannable มากขึ้น */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="guildUrl" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              ลิงก์กิลด์ (Guild URL) <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-xl shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all">
              <span className="inline-flex items-center bg-slate-50 dark:bg-gray-700 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 select-none border-r border-gray-200 dark:border-gray-600">
                {appUrl.replace(/https?:\/\//, '')}/g/
              </span>
              <input
                id="guildUrl"
                name="guildUrl"
                type="text"
                placeholder="my-guild"
                value={formData.guildUrl}
                onChange={handleGuildUrlChange}
                required
                className="w-full bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-sm font-medium"
              />
            </div>
            
            <div className="flex items-center gap-1.5 text-xs mt-1 min-h-[18px]">
              {guildUrlStatus.checking && (
                <span className="text-gray-500 flex items-center gap-1">🔄 กำลังตรวจสอบลิงก์...</span>
              )}
              {!guildUrlStatus.checking && guildUrlStatus.available === true && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">✅ ลิงก์นี้สามารถใช้งานได้</span>
              )}
              {!guildUrlStatus.checking && guildUrlStatus.available === false && (
                <span className="text-red-500 font-bold flex items-center gap-1">❌ ลิงก์นี้ถูกผู้อื่นใช้งานไปแล้ว</span>
              )}
            </div>
          </div>

          <FormTextarea
            label="รายละเอียดกิลด์ (Guild Description)"
            name="guildDescription"
            placeholder="อธิบายข้อมูล คำขวัญ หรือกฎเกณฑ์ของกิลด์คุณ..."
            value={formData.guildDescription}
            onChange={handleInputChange}
            rows={4}
          />

          <button
            onClick={handleNext}
            disabled={!guildUrlStatus.available || !formData.guildName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            ขั้นตอนถัดไป ➔
          </button>
        </div>
      )}

      {/* STEP 2: Contact Info */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-5 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm animate-in fade-in duration-300">
          
          {/* 🌟 3. ช่องกรอกอีเมลสำหรับแอดมินติดต่อกรณีระบบจ่ายเงิน/SaaS มีปัญหา */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <FormInput
              label="อีเมลติดต่อจริง (Contact Email)"
              name="contactEmail"
              type="email"
              placeholder="เช่น your_email@gmail.com"
              value={formData.contactEmail}
              onChange={handleInputChange}
              required
            />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 font-medium">
              💡 จำเป็นสำหรับการจัดการระบบ, ข้อมูลการต่ออายุแพลตฟอร์ม หรือกู้คืนระบบกรณีฉุกเฉิน
            </p>
          </div>

          <FormInput
            label="ลิงก์ Discord ของกิลด์ (ตัวเลือกเพิ่มเติม)"
            name="discordLink"
            type="url"
            placeholder="https://discord.gg/your-guild"
            value={formData.discordLink}
            onChange={handleInputChange}
          />

          

          <div className="flex gap-3 mt-2">
            <button
              onClick={handleBack}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold py-3 px-4 rounded-xl transition-all cursor-pointer"
            >
              ⬅ ย้อนกลับ
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer"
            >
              ขั้นตอนถัดไป ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Success Screen */}
      {currentStep === 3 && (
        <div className="flex flex-col gap-6 items-center py-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm animate-in zoom-in-95 duration-300">
          {!inviteLink ? (
            <>
              <div className="text-6xl animate-bounce">✨</div>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  ข้อมูลพร้อมแล้ว!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  ระบบตรวจสอบข้อมูลถูกต้องเรียบร้อย กดปุ่มด้านล่างเพื่อทำการจัดตั้งระบบกิลด์ของคุณ
                </p>
              </div>

              <div className="flex w-full gap-3 mt-2">
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? '⏳ กำลังตั้งค่าระบบกิลด์...' : '🚀 ยืนยันสร้างกิลด์เลย'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl animate-pulse">🎉</div>
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  สร้างกิลด์สำเร็จแล้ว!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ก๊อปปี้ลิงก์เชิญด้านล่างนี้ส่งต่อให้เพื่อนๆ ในกิลด์ใช้สมัครสมาชิกเข้ากลุ่มได้เลย
                </p>
              </div>

              <div className="w-full bg-slate-50 dark:bg-gray-700/60 border border-slate-200/60 dark:border-gray-600 rounded-xl p-4 mt-2">
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm text-blue-600 dark:text-blue-400 font-mono font-bold break-all">
                    {inviteLink}
                  </code>
                  <button
                    onClick={handleCopyInviteLink}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                    }`}
                  >
                    {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleGoToRegister}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer mt-4"
              >
                เข้าสู่ระบบหน้าต่างกิลด์ของคุณ ➔
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}