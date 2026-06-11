import { getTodayAuctionDashboard } from '@/app/actions/auction'

import AuctionBoard from '@/components/auction' // ดึงจากโฟลเดอร์มาเลย

export default async function AuctionPage() {
  const result = await getTodayAuctionDashboard()
  
  // สร้าง Server Action แบบ inline เล็กๆ เพื่อส่งเป็น prop ให้ onRefresh()
  async function reloadData() {
    'use server'
    // Next.js ควรรีเฟรชให้เองจาก revalidatePath ภายใน actions แล้ว
    // ฟังก์ชันนี้แค่ให้ Component มี callback เฉยๆ
  }

  return (
    <div className="p-4 sm:p-8  min-h-screen">
      <AuctionBoard data={result} onRefresh={reloadData} />
    </div>
  )
}