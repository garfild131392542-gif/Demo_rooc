import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'

export default async function HomePage() {
  const session = await getSession()
  const sessionAny = session as any
  const supabase = await createClient()

  let profiles: any[] = [] // สร้างตัวแปรมารอรับข้อมูล

  // 💡 ดึงข้อมูลเฉพาะตอนที่มี session (ล็อกอินแล้ว) เท่านั้น
  if (session) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      // 💡 เติม .message ต่อท้าย จะช่วยให้ข้อความ Error อ่านง่ายขึ้น ไม่เป็น Object {}
      console.error('Error fetching profiles:', error.message)
    } else {
      profiles = data || []
    }
  }

  return (
    <div className="w-full mt-10 max-w-[1450px] mx-auto px-4 ">
      <header className="mb-8 mx-10">
        <h1 className="text-3xl font-bold">จัดทีมลงกิจกรรม</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
          {sessionAny?.profile?.role === 'admin'
            ? 'ลากและวางสมาชิก เพื่อจัดปาร์ตี้'
            : 'ดูรายชื่อสมาชิกและปาร์ตี้'}
        </p>
      </header>

      <Dashboard
        initialProfiles={profiles}
        isAdmin={sessionAny?.profile?.role === 'admin'}
      />
    </div>
  )
}