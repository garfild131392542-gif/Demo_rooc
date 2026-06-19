'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  verifyAndRenewSubscriptionAction, 
  getGuildTrialStatus, 
  getGuildPaymentHistory 
} from '@/app/actions/billing'
import { createClient } from '@/lib/supabase/client'

interface TrialStatus {
  trial_ends_at: string | null
  days_remaining: number
  is_expired: boolean
}

interface PaymentHistoryItem {
  id: string
  amount: number
  sender_name: string | null
  trans_date: string | null
  trans_ref: string | null
  status: string
  created_at: string
}

export default function BillingPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)

  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0812345678'
  const promptPayName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME || 'นายศักดิ์ธัช (Sakditach)'
  const packagePrice = 259

  // Fetch subscription and payment history on mount
  useEffect(() => {
    async function loadData() {
      try {
        const status = await getGuildTrialStatus()
        setTrialStatus(status)

        const history = await getGuildPaymentHistory()
        setPaymentHistory(history as PaymentHistoryItem[])

        // Fetch user's profile to get guild ID for storage folder naming
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('guild_id')
            .eq('id', user.id)
            .maybeSingle()
          
          if (profile?.guild_id) {
            setGuildId(profile.guild_id)
          }
        }
      } catch (err) {
        console.error('Error loading billing data:', err)
      }
    }
    loadData()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setUploadError(null)
      setUploadSuccess(null)
    }
  }

  const handleUploadAndVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setUploadError('กรุณาเลือกไฟล์สลิปการโอนเงิน')
      return
    }

    setUploadError(null)
    setUploadSuccess(null)

    startTransition(async () => {
      let finalSlipUrl = 'https://example.com/mock-slip.jpg'

      try {
        // 1. Try uploading to Supabase Storage bucket 'slips'
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `slip_${Date.now()}.${fileExt}`
        const filePath = guildId ? `${guildId}/${fileName}` : `unknown/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('slips')
          .upload(filePath, selectedFile, { upsert: true })

        if (uploadError) {
          console.warn('[Billing] Supabase upload failed, checking fallback:', uploadError.message)
          
          // Check if this might be a missing bucket or local dev environment
          if (uploadError.message.includes('bucket') || uploadError.message.includes('not found') || uploadError.message.includes('404')) {
            finalSlipUrl = 'https://example.com/mock-slip.jpg'
          } else {
            throw uploadError;
          }
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('slips')
            .getPublicUrl(filePath)
          finalSlipUrl = publicUrl
        }

        // 2. Call Server Action to verify using SlipOK
        const result = await verifyAndRenewSubscriptionAction(finalSlipUrl, packagePrice)

        if (!result.success) {
          setUploadError(result.error || 'การยืนยันชำระเงินไม่สำเร็จ')
          return
        }

        setUploadSuccess(
          result.isMock 
            ? `${result.message || ''} (เปิดใช้งานผ่าน Mock Mode เนื่องจากไม่มี API Key)` 
            : (result.message || null)
        )
        
        // Clear form
        setSelectedFile(null)
        setPreviewUrl(null)

        // Reload data
        const updatedStatus = await getGuildTrialStatus()
        setTrialStatus(updatedStatus)
        const updatedHistory = await getGuildPaymentHistory()
        setPaymentHistory(updatedHistory as PaymentHistoryItem[])

      } catch (err: any) {
        console.error('Payment process error:', err)
        setUploadError('เกิดข้อผิดพลาด: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'))
      }
    })
  }

  return (
    <div className="w-full max-w-[1450px] mx-auto px-4 py-8 transition-colors">
      
      {/* Heading Title */}
      <header className="mb-8 pl-2 sm:pl-4">
        <h1 className="text-3xl font-bold mb-2">ระบบสมาชิกและค่าบริการกิลด์ 👑</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          เข้าถึงฟีเจอร์จองคิวประมูลไอเทมและระบบแจ้งเตือน Discord Bot แบบไม่จำกัดสมาชิก เพื่อกิลด์ที่แข็งแกร่งของคุณ
        </p>
      </header>

      {/* 🌟 1. Current Subscription Status Card */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 mb-8 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
              สถานะสมาชิกปัจจุบัน
            </h3>
            {trialStatus ? (
              <div className="flex items-center gap-2.5 mt-2">
                <span className={`text-2xl font-black ${trialStatus.is_expired ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {trialStatus.is_expired ? 'หมดอายุแล้ว' : `ใช้งานได้อีก ${trialStatus.days_remaining} วัน`}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${trialStatus.is_expired ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30' : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30'}`}>
                  {trialStatus.is_expired ? 'Expired' : 'Active'}
                </span>
              </div>
            ) : (
              <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mt-2"></div>
            )}
            {trialStatus?.trial_ends_at && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                หมดอายุวันที่: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(trialStatus.trial_ends_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
              </p>
            )}
          </div>
          <div className="w-full md:w-auto bg-white/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center md:text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">แพ็กเกจปัจจุบัน</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-450">PRO Plan (30 วัน)</span>
          </div>
        </div>
      </div>

      {/* 🌟 Grid: QR Code Scan & Upload Slip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Box 1: PromptPay QR Code (Left) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 md:p-8 flex flex-col items-center justify-between shadow-sm transition-colors">
          <div className="w-full text-center">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 block">ขั้นตอนที่ 1: สแกนชำระเงิน</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">โอนเงินผ่าน PromptPay</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">สแกนจ่าย QR Code เพื่อต่ออายุระบบ 30 วัน</p>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-2xl shadow-md relative group overflow-hidden border border-slate-200 max-w-[240px] mb-6">
            <img 
              src={`https://promptpay.io/${promptPayId}/${packagePrice}.png`} 
              alt="PromptPay QR Code"
              className="w-full h-auto aspect-square"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center">
              <span className="text-[10px] font-bold text-yellow-300">
                ยอดเงินถูกล็อกไว้ที่ {packagePrice} บาท เพื่อให้ออโต้เช็กผ่านง่าย
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="w-full bg-white/40 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="flex justify-between items-center text-xs mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400">ชื่อบัญชี:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{promptPayName}</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500 dark:text-slate-400">พร้อมเพย์ ID:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{promptPayId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">ยอดเงินโอน:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{packagePrice} บาท</span>
            </div>
          </div>
        </div>

        {/* Box 2: Upload Slip Form (Right) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-sm transition-colors">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450 tracking-widest mb-1.5 block">ขั้นตอนที่ 2: อัปโหลดสลิป</span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">ส่งสลิปเพื่อตรวจสอบ</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">ระบบจะเช็คยอดเงินและต่ออายุให้กิลด์ทันทีผ่าน SlipOK API</p>

            {/* Status Alert Messages */}
            {uploadError && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl p-4 mb-5 animate-in fade-in duration-200">
                ⚠️ {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-xl p-4 mb-5 animate-in fade-in duration-200">
                🎉 {uploadSuccess}
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleUploadAndVerify} className="space-y-5">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500/50 rounded-xl p-6 bg-white/30 dark:bg-slate-950/40 transition-colors relative">
                <input 
                  type="file" 
                  id="slipFile" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <img 
                      src={previewUrl} 
                      alt="Slip Preview" 
                      className="max-h-40 object-contain rounded-lg border border-slate-200 dark:border-slate-800"
                    />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[200px]">
                      {selectedFile?.name}
                    </span>
                    <span className="text-[10px] text-slate-500">คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน</span>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <svg className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">เลือกไฟล์ภาพสลิปที่โอนเงิน</span>
                    <span className="text-[10px] text-slate-500">รองรับไฟล์ PNG, JPG, JPEG (ขนาดไม่เกิน 5MB)</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedFile || isPending}
                className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-200 dark:disabled:from-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-blue-500/10 text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังอัปโหลดและตรวจสอบสลิป...
                  </>
                ) : (
                  '🚀 ตรวจสอบสลิปและเปิดใช้งาน'
                )}
              </button>
            </form>
          </div>

          <div className="bg-white/40 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mt-6 text-center">
            <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed">
              ระบบจะตรวจสอบความถูกต้องจาก **รหัส QR Code (Ref)** บนสลิป หากไม่มี API Key ระบบจะตรวจสอบในรูปแบบ **Mock Mode** และผ่านให้ทันทีสำหรับการทดสอบใช้งานในขั้นตอนพัฒนา
            </p>
          </div>
        </div>

      </div>

      {/* 🌟 3. Payment History Section */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">ประวัติการชำระเงินของกิลด์</h3>
        
        {paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">วันที่ทำรายการ</th>
                  <th className="py-3 px-4">ผู้ทำรายการ</th>
                  <th className="py-3 px-4">รหัสอ้างอิงสลิป (Ref)</th>
                  <th className="py-3 px-4 text-right">ยอดเงินโอน</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                {paymentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/20 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : 'ไม่ระบุ'}
                    </td>
                    <td className="py-3.5 px-4 max-w-[150px] truncate">
                      {item.sender_name || 'ไม่ระบุชื่อ'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.trans_ref || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {item.amount.toLocaleString()} บาท
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30'}`}>
                        {item.status === 'success' ? 'สำเร็จ' : 'ล้มเหลว'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-white/20 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/45 rounded-xl">
            <svg className="w-10 h-10 text-slate-450 dark:text-slate-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs text-slate-450 dark:text-slate-500">ยังไม่มีประวัติการต่ออายุในระบบ</p>
          </div>
        )}
      </div>

    </div>
  )
}