'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAction } from '@/app/actions/register'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordText, setPasswordText] = useState('')
  const [confirmPasswordText, setConfirmPasswordText] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // เช็คว่ากรอกรหัสผ่านตรงกันไหม
    if (formData.get('password') !== formData.get('confirm_password')) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    const result = await registerAction(formData)

    if (!result.success) {
      setError(result.error || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // เด้งไปหน้า Login หลังจากสมัครเสร็จใน 2 วินาที
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  const JOB_OPTIONS = [
    'Lord Knight', 'Paladin', 'Biochemist', 'Mastersmith', 'Bard', 'Gypsy',
    'Sniper', 'Champion', 'Priest', 'Assassin', 'Rogue', 'Wizard', 'Sage', 'Summoner'
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Join MY Guild
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ลงทะเบียนข้อมูลสมาชิกใหม่
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4 shadow-sm border border-green-200 dark:bg-green-900/20">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-400 text-center">
              ✅ ลงทะเบียนสำเร็จ! กำลังพากลับไปหน้าเข้าสู่ระบบ...
            </h3>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 shadow-sm border border-red-200 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User name*</label>
              <input name="uid_game" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อตัวละคร *</label>
              <input name="display_name" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อาชีพ *</label>
              <select name="job_name" required defaultValue="" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="" disabled>-- กรุณาเลือกอาชีพ --</option>
                {JOB_OPTIONS.map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
            </div>

           {/* --- ช่องตั้งรหัสผ่าน --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ตั้งรหัสผ่าน *</label>
              <div className="relative mt-1">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordText}
                  onChange={(e) => setPasswordText(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* --- ช่องยืนยันรหัสผ่าน --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ยืนยันรหัสผ่าน *</label>
              <div className="relative mt-1">
                <input
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPasswordText}
                  onChange={(e) => setConfirmPasswordText(e.target.value)}
                  className={`block w-full rounded-md border px-3 py-2 pr-10 text-gray-900 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 ${
                    confirmPasswordText && passwordText !== confirmPasswordText
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' // สีแดงถ้าไม่ตรง
                      : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500' // สีปกติ
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {/* ข้อความแจ้งเตือนสีแดง จะโชว์ก็ต่อเมื่อพิมพ์รหัสยืนยันแล้วแต่ไม่ตรงกับรหัสผ่าน */}
              {confirmPasswordText && passwordText !== confirmPasswordText && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                  ❌ รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (confirmPasswordText !== '' && passwordText !== confirmPasswordText)}
              className="mt-6 flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังบันทึก...' : 'ลงทะเบียน'}
            </button>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                มีบัญชีอยู่แล้ว? กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}