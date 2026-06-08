import { RegisterForm } from './RegisterForm'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
  return (
    <>
      <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-end w-full overflow-hidden bg-gray-900">
        
        {/* =======================
            เลเยอร์ 0: รูปภาพพื้นหลังแบบเต็มจอ (Full-Screen)
            ======================= */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/register.jpg" // ชื่อไฟล์รูปภาพในโฟลเดอร์ public
            alt="Epic Fantasy Guild Background"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
        
        {/* =======================
            เลเยอร์ 1: แผ่น Overlay ดรอปแสงรูปภาพ 
            ======================= */}
        <div className="absolute inset-0 z-10 bg-black/40 dark:bg-black/60 mix-blend-multiply" />

        {/* =======================
            เลเยอร์ 2: คอนเทนต์ข้อความ (60%) และ แผงฟอร์มกระจก (40%) 
            ======================= */}
        
        {/* ข้อความต้อนรับฝั่งซ้าย (กินพื้นที่ 60% บนจอใหญ่) */}
        <div className="relative z-20 hidden lg:flex flex-col flex-1 p-12 text-left self-center">
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            START YOUR<br />JOURNEY
          </h1>
          <p className="mt-6 text-lg font-medium text-blue-100 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            เริ่มต้นการผจญภัยของคุณ สร้างบัญชีเพื่อเข้าร่วมกิลด์และจัดระเบียบปาร์ตี้ไปพร้อมกับเพื่อนๆ
          </p>
        </div>

        {/* แผงควบคุมฟอร์มสไตล์ Liquid-Glass ฝั่งขวา (กินพื้นที่ 40% บนจอใหญ่) */}
        <div className="relative z-20 w-full lg:w-[40%] min-h-screen flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20 bg-white/10 dark:bg-black/30 backdrop-blur-xl border-l border-white/20 shadow-[-15px_0_50px_rgba(0,0,0,0.5)]">
          
          <div className="w-full max-w-sm mx-auto">
            <div className="text-center lg:text-left mb-6">
              <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                ลงทะเบียน
              </h2>
              <p className="mt-2 text-sm text-blue-100/90 drop-shadow-sm">
                สร้างบัญชี Guild ของคุณวันนี้เพื่อเริ่มต้นใช้งาน
              </p>
            </div>

            {/* เรียกใช้ Component ฟอร์มลงทะเบียนเดิมของคุณ */}
            <RegisterForm />

            {/* ลิงก์สำหรับเปลี่ยนเส้นทางกลับไปหน้าล็อกอิน */}
            <div className="mt-6 flex flex-col items-center gap-4 border-t border-white/20 pt-6 text-center">
              <p className="text-sm text-blue-100/90 drop-shadow-sm">
                มีบัญชีอยู่แล้วใช่ไหม?{' '}
                <Link href="/login" className="font-bold text-blue-300 hover:text-white hover:underline transition-colors drop-shadow-sm">
                  เข้าสู่ระบบที่นี่
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}