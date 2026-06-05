'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/FormInput'
import { registerAction } from '@/app/actions/register'
import { validateEmail, validatePhoneNumber, validatePassword, validatePasswordMatch } from '@/lib/validations'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    setError(null)
  }

  const handleBlur = (field: string) => {
    let error = ''

    switch (field) {
      case 'email':
        const emailValidation = validateEmail(formData.email)
        if (!emailValidation.valid && formData.email) {
          error = emailValidation.error || ''
        }
        break
      case 'phone':
        const phoneValidation = validatePhoneNumber(formData.phone)
        if (!phoneValidation.valid && formData.phone) {
          error = phoneValidation.error || ''
        }
        break
      case 'password':
        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid && formData.password) {
          error = passwordValidation.error || ''
        }
        break
      case 'confirmPassword':
        const matchValidation = validatePasswordMatch(formData.password, formData.confirmPassword)
        if (!matchValidation.valid && formData.confirmPassword) {
          error = matchValidation.error || ''
        }
        break
    }

    if (error) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: error,
      }))
    }
  }

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    validatePhoneNumber(formData.phone).valid &&
    validateEmail(formData.email).valid &&
    validatePassword(formData.password).valid &&
    validatePasswordMatch(formData.password, formData.confirmPassword).valid &&
    Object.keys(fieldErrors).length === 0

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!isFormValid) {
      setError('Please fix all errors before submitting')
      return
    }

    setIsLoading(true)

    try {
      const result = await registerAction(formData)

      if (!result.success) {
        setError(result.error || 'Registration failed')
        setIsLoading(false)
        return
      }

      // Redirect to profile setup
      router.push('/profile-setup')
    } catch (err) {
      console.error('Unexpected error during registration:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="ชื่อจริง"
          name="firstName"
          placeholder="John"
          value={formData.firstName}
          onChange={handleInputChange}
          error={fieldErrors.firstName}
          required
        />
        <FormInput
          label="นามสกุล"
          name="lastName"
          placeholder="Doe"
          value={formData.lastName}
          onChange={handleInputChange}
          error={fieldErrors.lastName}
          required
        />
      </div>

      <FormInput
        label="หมายเลขโทรศัพท์"
        name="phone"
        type="tel"
        placeholder="0123456789"
        value={formData.phone}
        onChange={handleInputChange}
        onBlur={() => handleBlur('phone')}
        error={fieldErrors.phone}
        required
      />

      <FormInput
        label="อีเมล"
        name="email"
        type="email"
        placeholder="your@email.com"
        value={formData.email}
        onChange={handleInputChange}
        onBlur={() => handleBlur('email')}
        error={fieldErrors.email}
        required
      />

      <FormInput
        label="รหัสผ่าน"
        name="password"
        type="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleInputChange}
        onBlur={() => handleBlur('password')}
        error={fieldErrors.password}
        required
      />

      <FormInput
        label="ยืนยันรหัสผ่าน"
        name="confirmPassword"
        type="password"
        placeholder="••••••••"
        value={formData.confirmPassword}
        onChange={handleInputChange}
        onBlur={() => handleBlur('confirmPassword')}
        error={fieldErrors.confirmPassword}
        required
      />

      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors mt-2"
      >
        {isLoading ? 'กำลังโหลด...' : 'เริ่มต้นทดลองใช้งาน 14 วัน'}
      </button>
    </form>
  )
}
