import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileSetupForm from './ProfileSetupForm' 

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ดึงข้อมูลเดิมจาก Database มา (ถ้ามี)
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, uid_game, job_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-12 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      
      {/* เรียกใช้งานไฟล์ฟอร์มที่เราสร้างใหม่ แล้วส่งข้อมูล profile เดิมเข้าไป */}
      <ProfileSetupForm initialProfile={profile} />
    </div>
  )
}