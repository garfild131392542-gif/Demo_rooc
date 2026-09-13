import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { getManageableGuilds, getAllAnnouncementsForAdmin, getUpdateTickerSetting, checkIsSystemAdmin } from '@/app/actions/admin-guilds'
import AdminControlClient from './AdminControlClient'

export const dynamic = 'force-dynamic'

export default async function AdminControlPage() {
  // 1. Verify User Session
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  const sessionAny = session as any

  // 2. Verify System Admin Privileges (uses cached helper shared with Navbar and Actions)
  const isSystemAdmin = await checkIsSystemAdmin(sessionAny.user.id)
  if (!isSystemAdmin) {
    redirect('/')
  }

  // 3. Fetch Initial Guilds, All Announcements, and Update Ticker Settings
  const [guilds, announcements, ticker] = await Promise.all([
    getManageableGuilds(),
    getAllAnnouncementsForAdmin(),
    getUpdateTickerSetting()
  ])

  return (
    <AdminControlClient 
      initialGuilds={guilds}
      initialAnnouncements={announcements}
      initialTicker={ticker}
    />
  )
}
