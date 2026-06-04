'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProfileSetupAction } from '@/app/actions/profile'
import { FormInput } from '@/components/FormInput' // ใช้ Component เดิมของคุณได้เลย

export default function ProfileSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    displayName: '',
    uidGame: '',
    passwordGame: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // เรียกใช้ Server Action ที่เราเขียนไว้
    const result = await createProfileSetupAction({
      displayName: formData.displayName,
      uidGame: formData.uidGame,
      passwordGame: formData.passwordGame,
    })

    if (!result.success) {
      setError(result.error || 'บันทึกข้อมูลไม่สำเร็จ')
      setIsLoading(false)
      return
    }

    // บันทึกเสร็จ เด้งเข้า Dashboard ของจริง!
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตั้งค่าโปรไฟล์ตัวละคร</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            กรอกข้อมูลตัวละครของคุณเพื่อเริ่มต้นใช้งานระบบ
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="ชื่อตัวละคร (Display Name)"
            name="displayName"
            placeholder="เช่น DemonHunter"
            value={formData.displayName}
            onChange={handleInputChange}
            required
          />

          <FormInput
            label="UID ในเกม"
            name="uidGame"
            placeholder="เช่น 123456789"
            value={formData.uidGame}
            onChange={handleInputChange}
            required
          />

          <FormInput
            label="รหัสผ่านในเกม (ถ้ามี)"
            name="passwordGame"
            type="text"
            placeholder="ปล่อยว่างได้ถ้าระบบไม่บังคับ"
            value={formData.passwordGame}
            onChange={handleInputChange}
          />

          <button
            type="submit"
            disabled={isLoading || !formData.displayName || !formData.uidGame}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกโปรไฟล์ และเข้าสู่ Dashboard'}
          </button>
        </form>

      </div>
    </div>
  )
}