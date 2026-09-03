import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import LeaderboardTable from './LeaderboardTable'

export default async function MembersPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const supabase = await createClient()

  // 1. ดึง guild_id ของผู้ใช้งานปัจจุบันที่กำลังเปิดดูหน้าเว็บนี้
  const myGuildId = (session as any)?.profile?.guild_id

  // 💡 ระบบป้องกัน: หากยังไม่มีการสังกัดกิลด์ จะไม่อนุญาตให้เห็นรายชื่อสมาชิกกิลด์อื่น
  if (!myGuildId) {
    redirect('/onboarding')
  }

  // 🌟 2. ดึงข้อมูลโปรไฟล์ล็อกเฉพาะคนที่มี guild_id ตรงกับเราเท่านั้น พร้อมข้อมูลปาร์ตี้และสถานะลา
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, cp, display_name, job_name, pvp_reduc, pvp_dmg, p_def, m_def, p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc, hp, sp, ignore_pdef, ignore_mdef, cri, cri_dmg, character_showcase_url, avatar_url, party_id, slot_index, party_id_guild_league, slot_index_guild_league, party_id_emperium_overrun, slot_index_emperium_overrun, is_on_leave')
    .eq('guild_id', myGuildId) // 🔐 กั้นสิทธิ์คัดกรองข้ามกิลด์เด็ดขาด
    .order('pvp_dmg', { ascending: false })

  if (error) {
    console.error('Leaderboard fetch error:', error.message)
    return <div className="p-8 text-red-500 text-center font-medium">เกิดข้อผิดพลาดในการโหลดตารางจัดอันดับ</div>
  }

  // ดึงข้อมูลกิลด์เพื่อเอาชื่อกิลด์และค่าไอดี 3 คนที่ถูกเลือกจัดอันดับเกียรติยศ
  const { data: guildData } = await supabase
    .from('guilds')
    .select('name, hall_of_fame_gold_uid, hall_of_fame_silver_uid, hall_of_fame_bronze_uid')
    .eq('id', myGuildId)
    .maybeSingle()

  const isAdmin = (session as any)?.profile?.role === 'admin'

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white tracking-tight">
          สมาชิก & ระบบจัดการกำลังพลกิลด์
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          จัดอันดับความแข็งแกร่ง เปรียบเทียบประสิทธิภาพห้องหลัก/ห้องรอง และระบบเช็คชื่อกิจกรรมประจำวัน
        </p>
      </header>
      
      <LeaderboardTable 
        profiles={profiles || []} 
        hallOfFameGold={guildData?.hall_of_fame_gold_uid || null}
        hallOfFameSilver={guildData?.hall_of_fame_silver_uid || null}
        hallOfFameBronze={guildData?.hall_of_fame_bronze_uid || null}
        isAdmin={isAdmin}
        guildId={myGuildId}
        guildName={guildData?.name || 'ROOC Guild'}
      />
    </div>
  )
}