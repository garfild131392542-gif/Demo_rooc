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

  // 2. ดึงข้อมูล Profile และ Role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('guild_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Fetch profile database error:', profileError.message)
  }

  // 3. ดึงข้อมูลกิลด์โดยตรงด้วย guild_id หลีกเลี่ยงปัญหา Embedding Relationship ซ้ำซ้อน
  let guild = null
  if (profile?.guild_id) {
    const { data: guildData, error: guildError } = await supabase
      .from('guilds')
      .select(`
        id,
        name,
        guild_url,
        description,
        status,
        invite_code,
        discord_link,
        logo_url,
        primary_color,
        hall_of_fame_gold_uid,
        hall_of_fame_silver_uid,
        hall_of_fame_bronze_uid,
        discord_class_channel_id,
        discord_name_channel_id,
        discord_reserve_channel_id,
        created_at
      `)
      .eq('id', profile.guild_id)
      .maybeSingle()

    if (guildError) {
      console.error('Fetch guild database error:', guildError.message)
    } else {
      guild = guildData
    }
  }
  
  // 🌟 เช็คสิทธิ์ว่าเป็นผู้ดูแลระบบ (Admin) หรือไม่
  const isAdmin = profile?.role === 'admin'

  // 2.5 ดึงรายชื่อสมาชิกทั้งหมดในกิลด์นี้เพื่อส่งให้ dropdown ตัวเลือกทำเนียบเกียรติยศ
  let guildMembers: any[] = []
  if (guild) {
    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, display_name, job_name')
      .eq('guild_id', guild.id)
      .order('display_name', { ascending: true })
    guildMembers = membersData || []
  }

  // 3. กรณีที่ไม่พบข้อมูลกิลด์
  if (!guild) {
    return (
      // 💡 ปรับให้ไม่มีสีทับ เพื่อโชว์ BG ภาพ
      <div className="min-h-screen flex items-center justify-center py-12 px-4 transition-colors">
        
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
    // 💡 ปรับให้ไม่มีสีทับ เพื่อโชว์ BG ภาพ
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <GuildStatusForm guild={guild} isAdmin={isAdmin} members={guildMembers} />
    </div>
  )
}