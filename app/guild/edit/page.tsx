import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import GuildStatusForm from './GuildStatusForm' // 🌟 เรียกใช้ฟอร์มที่เราจะสร้างใหม่ในโฟลเดอร์เดียวกัน

export default async function GuildStatusPage() {
  const supabase = await createClient()
  
  // 1. ตรวจสอบการล็อกอิน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. ดึงข้อมูล Profile, Role และข้อมูลกิลด์ (เพิ่มคอลัมน์ discord_link มาด้วย)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      guild_id,
      role,
      guilds (
        id,
        name,
        guild_url,
        description,
        status,
        invite_code,
        discord_link,
        created_at
      )
    `)
    .eq('id', user.id)
    .maybeSingle() as any

  if (error) {
    console.error('Fetch guild status database error:', error.message)
  }

  const guild = Array.isArray(profile?.guilds) ? profile.guilds[0] : profile?.guilds
  
  // 🌟 เช็คสิทธิ์ว่าเป็นผู้ดูแลระบบ (Admin) หรือไม่
  const isAdmin = profile?.role === 'admin'

  // 3. กรณีที่ไม่พบข้อมูลกิลด์
  if (!guild) {
    return (
      // 💡 เพิ่มพื้นหลัง dark:bg-slate-900
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 transition-colors">
        
        {/* 💡 เพิ่มสีกล่อง dark:bg-slate-800, เส้นขอบ, และเงาในโหมดมืด */}
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-8 text-center transition-colors">
          
          {/* 💡 ปรับสีหัวข้อและข้อความย่อย */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">ไม่พบข้อมูลกิลด์</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">คุณยังไม่ได้สังกัดกิลด์ใดๆ หรือการสร้างกิลด์ยังไม่สมบูรณ์</p>
          
          <Link href="/profile-setup" className="inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            ไปหน้าเลือกเส้นทางกิลด์
          </Link>
        </div>
      </div>
    )
  }

  // 4. ส่งข้อมูลไปให้ฟอร์ม Client Component จัดการต่อ
  return (
    // 💡 เพิ่มพื้นหลัง dark:bg-slate-900
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <GuildStatusForm guild={guild} isAdmin={isAdmin} />
    </div>
  )
}