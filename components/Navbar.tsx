import { getSession } from '@/app/actions/auth'
import NavbarClient from './NavbarClient'
import { createClient } from '@/lib/supabase/server'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', session.id) // หรือ .eq('uid_game', session.uid_game) ตามโครงสร้างตารางคุณ
    .single()

  const enrichedSession = {
    ...session,
    display_name: profile?.display_name || 'Unknown' // ถ้าไม่มีชื่อให้ขึ้น Unknown
  }
  // โยนข้อมูล session ไปให้ Navbar ฝั่ง Client จัดการต่อ
  return <NavbarClient enrichedSession={enrichedSession} />
}