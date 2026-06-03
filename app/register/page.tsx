import { RegisterForm } from './RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ลงทะเบียน
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">สร้างบัญชี Guild ของคุณวันนี้</p>
          <RegisterForm />
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            มีบัญชีอยู่แล้ว?{' '}
            <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium">
              เข้าสู่ระบบ
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}