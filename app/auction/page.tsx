import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import { getAuctionHistory, getTodayAuctionDashboard } from '@/app/actions/auction'
import { getGuildRoundsOverview } from '@/app/actions/auction-rounds'
import { revalidatePath } from 'next/cache'

import AuctionBoard from '@/components/auction' // ดึงจากโฟลเดอร์มาเลย

export default async function AuctionPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const [result, historyResult, roundsResult] = await Promise.all([
    getTodayAuctionDashboard(),
    getAuctionHistory(),
    getGuildRoundsOverview(),
  ])

  const auctionData = {
    ...result,
    history: historyResult.success ? historyResult.history : [],
    roundsData: roundsResult.success ? roundsResult : null,
  }
  
  // Server Action ที่จริงๆ revalidate cache เพื่อให้ข้อมูลใหม่
  async function reloadData() {
    'use server'
    revalidatePath('/auction')
  }

  return (
    <div className="p-4 sm:p-8  min-h-screen">
      <AuctionBoard data={auctionData} onRefresh={reloadData} />
    </div>
  )
}