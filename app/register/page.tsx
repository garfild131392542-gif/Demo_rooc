import { RegisterForm } from './RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      
      {/* =======================
          ฝั่งซ้าย: รูปภาพและ Typography (Split-Screen)
          ======================= */}
      <div className="relative hidden w-1/2 lg:block bg-gray-900">
        {/* ใช้รูปภาพภาพตั้งแคมป์ที่คุณเลือกมา */}
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="images (1).jpg"
          alt="Ragnarok Origin Adventure"
        />
        {/* Overlay เอฟเฟกต์เฟดไล่สี ให้ดูพรีเมียมและอ่านตัวหนังสือชัด */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-indigo-900/60 to-transparent mix-blend-multiply" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg">
            START YOUR<br />JOURNEY
          </h1>
          <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-md">
            เริ่มต้นการผจญภัยของคุณ สร้างบัญชีเพื่อเข้าร่วมกิลด์และจัดระเบียบปาร์ตี้ไปพร้อมกับเพื่อนๆ
          </p>
        </div>
      </div>

      {/* =======================
          ฝั่งขวา: ฟอร์มสมัครสมาชิก
          ======================= */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              ลงทะเบียน
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              สร้างบัญชี Guild ของคุณวันนี้เพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          {/* เรียกใช้ Component ฟอร์ม */}
          <RegisterForm />

          <div className="mt-6 flex flex-col items-center gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              มีบัญชีอยู่แล้วใช่ไหม?{' '}
              <Link href="/login" className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-colors">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}