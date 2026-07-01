import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import LeaderboardTable from './LeaderboardTable'

export default async function MembersPage() {
  const session = await getSession()
  const supabase = await createClient()

  // 1. ดึง guild_id ของผู้ใช้งานปัจจุบันที่กำลังเปิดดูหน้าเว็บนี้
  const myGuildId = (session as any)?.profile?.guild_id

  // 💡 ระบบป้องกัน: หากไม่ได้เข้าสู่ระบบ หรือยังไม่มีการสังกัดกิลด์ จะไม่อนุญาตให้เห็นรายชื่อสมาชิกกิลด์อื่น
  if (!myGuildId) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 rounded-2xl p-6 font-medium inline-block shadow-sm">
          🔒 กรุณาเข้าสู่ระบบและเข้าร่วมกิลด์ก่อน เพื่อเปิดดูตารางอันดับสมาชิก
        </div>
      </div>
    )
  }

  // 🌟 2. ดึงข้อมูลโปรไฟล์ล็อกเฉพาะคนที่มี guild_id ตรงกับเราเท่านั้น ป้องกัน Data Leak
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, cp, display_name, job_name, pvp_reduc, pvp_dmg, p_def, m_def, p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc, hp, sp, ignore_pdef, ignore_mdef, cri, cri_dmg, character_showcase_url')
    .eq('guild_id', myGuildId) // 🔐 กั้นสิทธิ์คัดกรองข้ามกิลด์เด็ดขาด
    .order('pvp_dmg', { ascending: false })

  if (error) {
    console.error('Leaderboard fetch error:', error.message)
    return <div className="p-8 text-red-500 text-center font-medium">เกิดข้อผิดพลาดในการโหลดตารางจัดอันดับ</div>
  }

  // ดึงข้อมูลกิลด์เพื่อเอาค่าไอดี 3 คนที่ถูกเลือกจัดอันดับเกียรติยศ
  const { data: guildData } = await supabase
    .from('guilds')
    .select('hall_of_fame_gold_uid, hall_of_fame_silver_uid, hall_of_fame_bronze_uid')
    .eq('id', myGuildId)
    .maybeSingle()

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">รายชื่อสมาชิกในกิล</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          จัดอันดับความแข็งแกร่งแยกตามสายอาชีพภายในกิลด์ของคุณ
        </p>
      </header>
      
      <LeaderboardTable 
        profiles={profiles || []} 
        hallOfFameGold={guildData?.hall_of_fame_gold_uid || null}
        hallOfFameSilver={guildData?.hall_of_fame_silver_uid || null}
        hallOfFameBronze={guildData?.hall_of_fame_bronze_uid || null}
      />
    </div>
  )
}