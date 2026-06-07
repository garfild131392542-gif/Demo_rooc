import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Profile, Guild } from '@/types/database'

export default async function GuildStatusPage() {
  const supabase = await createClient()
  
  // 1. ตรวจสอบการล็อกอิน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. ดึงข้อมูล Profile พร้อม Join ข้อมูลกิลด์มาแสดงผล (แก้ไขคอลัมน์จาก server_name เป็น description)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      guild_id,
      guilds (
        name,
        guild_url,
        description,
        status,
        invite_code,
        created_at
      )
    `)
    .eq('id', user.id)
    .maybeSingle() as { data: { guild_id: string | null; guilds: Guild | Guild[] | null } | null; error: any }

  // พิมพ์ข้อผิดพลาดออกมาตรวจสอบในหน้าต่าง Terminal หากคำสั่งคิวรีทำงานไม่สำเร็จ
  if (error) {
    console.error('Fetch guild status database error:', error.message)
  }

  // จัดการ Type เผื่อกรณีที่ Supabase รีเทิร์น guilds มาเป็น Array
  const guild = Array.isArray(profile?.guilds) ? profile.guilds[0] : profile?.guilds

  // 3. กรณีที่ไม่พบกิลด์
  if (!guild) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">ไม่พบข้อมูลกิลด์</h1>
          <p className="text-slate-500 mb-6">คุณยังไม่ได้สังกัดกิลด์ใดๆ หรือการสร้างกิลด์ยังไม่สมบูรณ์</p>
          <Link href="/onboarding" className="inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            ไปหน้าสร้างกิลด์
          </Link>
        </div>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 4. กรณีที่มีกิลด์แล้ว ให้แสดงหน้าสรุปข้อมูล
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        
        {/* ส่วนหัวและป้ายสถานะ */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">ข้อมูลกิลด์ของคุณ</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            guild.status === 'approved' ? 'bg-green-100 text-green-700' :
            guild.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {guild.status === 'approved' ? 'พร้อมใช้งาน' : 
             guild.status === 'pending' ? 'รอตรวจสอบ' : guild.status}
          </span>
        </div>

        <p className="text-sm text-slate-500 mb-6">รายละเอียดกิลด์ที่คุณกำลังสังกัดอยู่</p>

        {/* การ์ดแสดงรายละเอียด */}
        <div className="space-y-4 bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8 shadow-inner">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">ชื่อกิลด์</p>
            <p className="text-lg font-medium text-slate-900">{guild.name}</p>
          </div>
          
          {/* ปรับเปลี่ยนตัวแปรการแสดงผลจาก server_name เป็น description ให้ตรงกับโครงสร้างใหม่ */}
          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">รายละเอียดกิลด์</p>
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{guild.description || '-'}</p>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">ลิงก์หน้ากิลด์ (Guild URL)</p>
            <p className="text-sm font-medium text-blue-600 break-all select-all">
              {appUrl}/g/{guild.guild_url}
            </p>
            <p className="text-xs text-slate-400 mt-1">แชร์ลิงก์นี้ให้เพื่อนเพื่อเข้ามาดูข้อมูลและสมัครเข้ากิลด์</p>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">รหัสเชิญ (Invite Code)</p>
            <p className="text-lg font-mono text-slate-800 font-bold tracking-widest select-all">{guild.invite_code || '-'}</p>
          </div>
        </div>
        
      </div>
    </div>
  )
}