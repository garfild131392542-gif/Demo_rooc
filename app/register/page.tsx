import { RegisterForm } from './RegisterForm'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  
  // 🌟 ถอด state isLoaded ออกทั้งหมด ใช้ CSS เพียวๆ

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-end w-full overflow-hidden bg-gray-950">
      
      {/* 🌟 1. รูปภาพพื้นหลัง */}
      <div className="absolute inset-0 z-0 animate-in fade-in zoom-in-[1.05] duration-[1500ms] ease-out">
        <Image
          src="/register.jpg"
          alt="Epic Fantasy Guild Background"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      </div>
      
      {/* เลเยอร์สีดรอปความสว่าง */}
      <div className="absolute inset-0 z-10 bg-black/40 dark:bg-black/60 mix-blend-multiply animate-in fade-in duration-[1500ms]" />

      {/* ข้อความต้อนรับฝั่งซ้าย */}
      <div className="relative z-20 hidden lg:flex flex-col flex-1 p-12 text-left self-center animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          START YOUR<br />JOURNEY
        </h1>
        <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          เริ่มต้นการผจญภัยของคุณ สร้างบัญชีเพื่อเข้าร่วมกิลด์และจัดระเบียบปาร์ตี้ไปพร้อมกับเพื่อนๆ
        </p>
      </div>

      {/* =======================
          ฝั่งขวา: แผงควบคุมฟอร์มสไตล์ Liquid-Glass
          ======================= */}
      <div className="relative z-20 w-full lg:w-[40%] min-h-screen flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white/10 dark:bg-black/30 backdrop-blur-xl lg:backdrop-blur-2xl border-t lg:border-t-0 lg:border-l border-white/20 dark:border-white/10 shadow-[-15px_0_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-right-16 duration-[800ms] ease-out">
        
        <div className="w-full max-w-sm mx-auto">
          
          <div className="text-center lg:text-left mb-6">
            <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              ลงทะเบียน
            </h2>
            <p className="mt-2 text-sm text-blue-100/80">
              สร้างบัญชี Guild ของคุณวันนี้เพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          <RegisterForm />

          {/* ลิงก์ย้อนกลับไปหน้าล็อกอิน */}
          <div className="mt-6 flex flex-col items-center border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-blue-100/90">
              มีบัญชีอยู่แล้วใช่ไหม?{' '}
              <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}