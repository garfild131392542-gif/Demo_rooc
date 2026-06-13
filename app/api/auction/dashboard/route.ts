import { getTodayAuctionDashboard, getAuctionHistory } from '@/app/actions/auction'

export async function GET() {
  const dashboardResult = await getTodayAuctionDashboard()
  const historyResult = await getAuctionHistory()

  if (!dashboardResult.success) {
    return Response.json(
      { success: false, error: dashboardResult.error },
      { status: 400 }
    )
  }

  return Response.json({
    ...dashboardResult,
    history: historyResult.success ? historyResult.history : []
  })
}
