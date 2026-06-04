import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './OnboardingForm'
// import Component ฟอร์มของคุณมา (เช่น OnboardingForm)

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ดึงชื่อจาก guild_owners เพื่อไปแสดงผล หรือทักทาย
  const { data: owner } = await supabase
    .from('guild_owners')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  // (ตัวเลือกเสริม) เช็คว่าถ้าสร้างกิลด์เสร็จแล้ว ให้เด้งไป Dashboard เลย
  const { data: existingGuild } = await supabase
    .from('guilds')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (existingGuild) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto p-4">
      {/* ส่งข้อมูลไปที่ Form Component ของคุณ */}
      <h1 className="text-2xl font-bold mb-4">ยินดีต้อนรับคุณ {owner?.first_name}!</h1>
      <p>มาก่อตั้งกิลด์ของคุณกันเถอะ</p>
      <OnboardingForm/>
    </div>
  )
}