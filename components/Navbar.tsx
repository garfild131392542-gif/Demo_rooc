import { getSession } from '@/app/actions/auth'
import NavbarClient from './NavbarClient'
import { createClient } from '@/lib/supabase/server'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null
  const sessionAny = session as any

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', sessionAny.user?.id ?? sessionAny.id)
    .single()

  // 🌟 Check if user is a System Admin from public.admins table
  const { data: adminCheck } = await supabase
    .from('admins')
    .select('id')
    .eq('id', sessionAny.user?.id ?? sessionAny.id)
    .maybeSingle()

  const enrichedSession = {
    uid_game: sessionAny.profile?.uid_game ?? '',
    role: sessionAny.profile?.role ?? '',
    is_system_admin: !!adminCheck,
    display_name:
      (profile as any)?.display_name ||
      sessionAny.profile?.display_name ||
      'Unknown',
  }
  // โยนข้อมูล session ไปให้ Navbar ฝั่ง Client จัดการต่อ
  return <NavbarClient enrichedSession={enrichedSession} />
}