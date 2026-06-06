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

  // 2. เช็คแค่กิลด์อย่างเดียว: ถ้ามีกิลด์แล้ว บังคับเด้งไปหน้า Profile Setup ทันที 
  // (ไม่ต้องไปเช็คซ้ำซ้อนว่ามี Profile หรือยัง เพราะยังไงเพิ่งสร้างกิลด์เสร็จก็ต้องไปกรอก Profile อยู่ดี)
  const { data: existingGuild } = await supabase
    .from('guilds')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existingGuild) {
    redirect('/profile-setup')
  }

  // 3. ไม่ต้อง Query หาชื่อจาก guild_owners ให้เสียเวลา บังคับแสดงข้อความต้อนรับไปเลย
  return (
    <div className="container mx-auto p-4">
      
      <OnboardingForm />
    </div>
  )
}