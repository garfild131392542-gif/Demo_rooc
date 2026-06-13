import { getAuctionHistory, getTodayAuctionDashboard } from '@/app/actions/auction'
import { revalidatePath } from 'next/cache'

import AuctionBoard from '@/components/auction' // ดึงจากโฟลเดอร์มาเลย

export default async function AuctionPage() {
  const result = await getTodayAuctionDashboard()
  const historyResult = await getAuctionHistory()
  const auctionData = {
    ...result,
    history: historyResult.success ? historyResult.history : []
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