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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* เรียกใช้งานไฟล์ฟอร์มที่เราสร้างใหม่ แล้วส่งข้อมูล profile เดิมเข้าไป */}
      <ProfileSetupForm initialProfile={profile} />
    </div>
  )
}