'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()

  const [uid, setUid] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // ฟังก์ชันแยกสำหรับการกดล็อกอินหรือบันทึกรหัสผ่านจริงๆ
  const executeLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loginAction(uid.trim(), password)

      if (!result.success) {
        setError(result.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
        setLoading(false)
        return
      }

      // On successful login, redirect to home
      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดที่ไม่รู้จัก โปรดลองอีกครั้ง')
      setLoading(false)
    }
  }

  // ฟังก์ชันสำหรับเช็คตอนกดปุ่ม Sign In ครั้งแรก
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError(null)
    setLoading(true)

    const supabase = createClient();

    // 1. ดึงข้อมูลมาเช็คก่อนว่ารหัสผ่านเป็น null ไหม
    const { data, error } = await supabase
      .from('profiles')
      .select('password_game')
      .eq('uid_game', uid.trim())
      .single();

    setLoading(false);

    if (error || !data) {
      // กรณีหาไอดีไม่เจอ ให้รันฟังก์ชันล็อกอินหลักไปเลย เพื่อให้มันแจ้ง Error ไปตามปกติ
      executeLogin();
      return;
    }

    if (data.password_game === null) {
      // ถ้ารหัสผ่านเป็น null ให้เปิดหน้าต่างแจ้งเตือน Modal
      setShowConfirmModal(true);
    } else {
      // ถ้ามีรหัสผ่านแล้ว ให้ข้ามไปล็อกอินเลย
      executeLogin();
    }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              ระบบจัดการสมาชิกกิล - เข้าสู่ระบบ
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              ลงชื่อเข้าสู่ระบบ
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 shadow-sm border border-red-200 dark:bg-red-900/20 dark:border-red-900/50">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label
                  htmlFor="uid"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  UID (Game)
                </label>
                <input
                  id="uid"
                  name="uid"
                  type="text"
                  required
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="Enter your UID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    placeholder="กรอกรหัสผ่าน..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:text-gray-300 mt-1"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-indigo-500 transition-colors"
              >
                {loading ? 'Processing...' : 'Sign In'}
              </button>
            </div>

            <div>
              สำหรับทดลอง
              admin = uid: ADM001, password: 123456
              <br />
              user = uid: MEM004, password: 123456
            </div>

          </form>
        </div>
      </div>

      {/* Modal ยืนยันรหัสผ่าน */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                ยืนยันการตั้งรหัสผ่าน 🔒
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                รหัสผ่านที่ท่านกรอกในครั้งนี้ <span className="font-semibold text-indigo-600 dark:text-indigo-400">จะถูกตั้งเป็นรหัสผ่านถาวร</span> สำหรับการเข้าสู่ระบบในครั้งต่อๆ ไป
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/50">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  ⚠️ หากลืมรหัสผ่านในภายหลัง โปรดติดต่อหัวกิลด์เพื่อทำการรีเซ็ต
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิกแก้ไข
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  executeLogin(); // พอกดยืนยัน ก็สั่งให้รันการตั้งรหัสผ่านเลย
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
              >
                ยืนยันการตั้งรหัส
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}