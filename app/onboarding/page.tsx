import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. ถ้ายังไม่ล็อกอิน บังคับไปหน้า login
  if (!user) {
    redirect('/login')
  }

  // ดึงข้อมูล profile มาตรวจสอบทั้ง guild_id และข้อมูลตัวละคร (เช่น job_name)
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('guild_id, job_name')
    .eq('id', user.id)
    .single()

  // 🌟 ด่านที่ 1: ถ้าเขามีกิลด์อยู่แล้ว (ไม่ว่าจะสร้างเองหรือเข้าร่วม) ให้กลับหน้า Dashboard
  if (profile?.guild_id) {
    redirect('/')
  }

  // 🌟 ด่านที่ 2: ถ้าเขาไม่มีกิลด์ "แต่" ยังไม่เคยตั้งข้อมูลตัวละครเลย 
  // (แปลว่าแอบพิมพ์ URL /onboarding เข้ามาตรงๆ โดยไม่ผ่านหน้า Hub)
  // ให้เตะกลับไปหน้า Hub เพื่อให้เขาเลือกว่าจะ "สร้าง" หรือ "เข้าร่วม" ให้ถูกต้องก่อน
  if (!profile?.job_name) {
    redirect('/profile-setup')
  }

  // 🌟 ด่านที่ 3: ไม่มีกิลด์ + มีข้อมูลตัวละครแล้ว = คนนี้ตั้งใจมาสร้างกิลด์จริงๆ อนุญาตให้เห็นฟอร์มได้
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-12 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      <OnboardingForm />
    </div>
  )
}