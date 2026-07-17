import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { getManageableGuilds, getLatestAnnouncementForAdmin, getUpdateTickerSetting } from '@/app/actions/admin-guilds'
import AdminControlClient from './AdminControlClient'

export const dynamic = 'force-dynamic'

export default async function AdminControlPage() {
  // 1. Verify User Session
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  const sessionAny = session as any

  // 2. Verify System Admin Privileges
  const supabase = await createClient()
  const { data: adminCheck, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', sessionAny.user.id)
    .maybeSingle()

  if (adminError || !adminCheck) {
    redirect('/')
  }

  // 3. Fetch Initial Guilds, Latest Announcement, and Update Ticker Settings
  const [guilds, announcement, ticker] = await Promise.all([
    getManageableGuilds(),
    getLatestAnnouncementForAdmin(),
    getUpdateTickerSetting()
  ])

  return (
    <AdminControlClient 
      initialGuilds={guilds}
      initialAnnouncement={announcement}
      initialTicker={ticker}
    />
  )
}
