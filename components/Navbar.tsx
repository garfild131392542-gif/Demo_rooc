import { getSession } from '@/app/actions/auth'
import NavbarClient from './NavbarClient'
import { createClient } from '@/lib/supabase/server'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null
  const sessionAny = session as any

  const supabase = await createClient()

  const userId = sessionAny.user?.id ?? sessionAny.id
  const guildId = sessionAny.profile?.guild_id

  // 🌟 Parallel fetch for admin check and guild details (zero redundant queries)
  const [adminCheckRes, guildRes] = await Promise.all([
    supabase.from('admins').select('id').eq('id', userId).maybeSingle(),
    guildId
      ? supabase.from('guilds').select('name, logo_url').eq('id', guildId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const adminCheck = adminCheckRes.data
  const guild = guildRes.data

  const guildName = guild?.name || (guildId ? 'ไม่มีกิลด์' : 'ยังไม่มีกิลด์')
  const logoUrl = guild?.logo_url || null

  const enrichedSession = {
    uid_game: sessionAny.profile?.uid_game ?? '',
    role: sessionAny.profile?.role ?? '',
    is_system_admin: !!adminCheck,
    display_name: sessionAny.profile?.display_name || sessionAny.user?.email || 'Unknown',
  }
  // โยนข้อมูล session ไปให้ Navbar ฝั่ง Client จัดการต่อ
  return (
    <NavbarClient
      enrichedSession={enrichedSession}
      initialGuildName={guildName}
      initialLogoUrl={logoUrl}
    />
  )
}