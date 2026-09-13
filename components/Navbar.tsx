import { getSession } from '@/app/actions/auth'
import NavbarClient from './NavbarClient'
import { checkIsSystemAdmin } from '@/app/actions/admin-guilds'
import { getGuildBasicInfo } from '@/app/actions/guild'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null
  const sessionAny = session as any

  const userId = sessionAny.user?.id ?? sessionAny.id
  const guildId = sessionAny.profile?.guild_id

  // 🌟 Deduplicated parallel fetch via React cache (bypasses RLS, 0 redundant queries)
  const [isSystemAdmin, guild] = await Promise.all([
    checkIsSystemAdmin(userId),
    guildId ? getGuildBasicInfo(guildId) : Promise.resolve(null),
  ])

  const guildName = guild?.name || (guildId ? 'ไม่มีกิลด์' : 'ยังไม่มีกิลด์')
  const logoUrl = guild?.logo_url || null

  const enrichedSession = {
    uid_game: sessionAny.profile?.uid_game ?? '',
    role: sessionAny.profile?.role ?? '',
    is_system_admin: isSystemAdmin,
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