import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CredentialsTable from './CredentialsTable'
import { Profile } from '@/types/database'

export default async function AdminCredentialsPage() {
  const supabase = await createClient()

  // 1. ตรวจสอบสิทธิ์การเข้าสู่ระบบปัจจุบัน
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. ดึงข้อมูลโปรไฟล์ของแอดมินปัจจุบัน เพื่อแกะเอาค่า guild_id และตรวจสอบสิทธิ์ role
  const { data: adminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('guild_id, role')
    .eq('id', user.id)
    .maybeSingle() as { data: Pick<Profile, 'guild_id' | 'role'> | null; error: any }

  if (adminError || !adminProfile) {
    console.error('Error fetching admin profile:', adminError?.message)
    return <div className="p-8 text-red-500">Error loading admin session profile.</div>
  }

  // Security Check: หากไม่มีกิลด์ หรือไม่ได้มีสถานะ role เป็น admin ให้ปฏิเสธการเข้าใช้งานหน้าต่างนี้
  if (adminProfile.role !== 'admin' || !adminProfile.guild_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">ปฏิเสธการเข้าถึงสิทธิ์</h1>
          <p className="text-slate-500 text-sm mb-4">บัญชีของคุณไม่มีสิทธิ์ผู้ดูแลระบบในการจัดการข้อมูลกิลด์นี้</p>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  // 3. ดึงข้อมูลโปรไฟล์เฉพาะสมาชิกที่อยู่ภายในกิลด์เดียวกันเท่านั้น (แยกสิทธิ์การจัดการตามกิลด์)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, uid_game, display_name, job_name, role, pvp_reduc, pvp_dmg, is_on_leave, updated_at, last_stat_update, p_def, m_def, p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc')
    .eq('guild_id', adminProfile.guild_id) // คัดกรองข้อมูลเจาะจงเฉพาะสมาชิกในกิลด์ของแอดมินคนนั้น
    .order('id', { ascending: true })

  if (error) {
    console.error('Error loading guild members data:', error.message)
    return <div className="p-8 text-red-500">Error loading credentials.</div>
  }

  // จัดการปรับโครงสร้างข้อมูลให้อยู่ในสถานะปลอดภัยก่อนส่งไปทำงานที่ตารางหน้าบ้าน
  const profilesSafe = (profiles || []) as any[]
  const managementData = profilesSafe.map(p => ({
    id: p.id,
    uid_game: p.uid_game,
    display_name: p.display_name,
    job_name: p.job_name,
    role: p.role,
    pvp_reduc: p.pvp_reduc,
    pvp_dmg: p.pvp_dmg,
    p_def: p.p_def,
    m_def: p.m_def,
    
    p_atk: p.p_atk,
    m_atk: p.m_atk,
    p_dmg: p.p_dmg,
    m_dmg: p.m_dmg,
    p_reduc: p.p_reduc,
    m_reduc: p.m_reduc,

    hp: p.hp,
    sp: p.sp,
    ignore_pdef: p.ignore_pdef,
    ignore_mdef: p.ignore_mdef,

    is_on_leave: p.is_on_leave || false,
    updated_at: p.updated_at,
    last_stat_update: p.last_stat_update,
  }))

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 ">
      <CredentialsTable initialData={managementData} />
    </div>
  )
}