import { createClient } from '@/lib/supabase/server'
import CredentialsTable from './CredentialsTable'

export default async function AdminCredentialsPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    // 👇 เพิ่มชื่อฟิลด์ใหม่เข้าไปตรงนี้ 👇
    .select('id, uid_game, display_name, job_name, role, password_game, pvp_reduc, pvp_dmg, is_on_leave, updated_at, last_stat_update, p_def, m_def, p_atk, m_atk, p_dmg, m_dmg, p_reduc, m_reduc')
    .order('id', { ascending: true })

  if (error) {
    return <div className="p-8 text-red-500">Error loading credentials.</div>
  }

  // We map profiles to only expose what's necessary
  const managementData = profiles.map(p => ({
    id: p.id,
    uid_game: p.uid_game,
    display_name: p.display_name,
    job_name: p.job_name,
    role: p.role,
    pvp_reduc: p.pvp_reduc,
    pvp_dmg: p.pvp_dmg,
    p_def: p.p_def,
    m_def: p.m_def,
    
    // 👇 เพิ่ม 6 บรรทัดนี้เข้าไปเพื่อให้ข้อมูลครบตาม Type 👇
    p_atk: p.p_atk,
    m_atk: p.m_atk,
    p_dmg: p.p_dmg,
    m_dmg: p.m_dmg,
    p_reduc: p.p_reduc,
    m_reduc: p.m_reduc,

    isPasswordSet: p.password_game !== null,
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
