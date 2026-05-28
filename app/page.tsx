import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'

export default async function HomePage() {
  const session = await getSession()
  const supabase = await createClient()

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching profiles:', error)
  }

  return (
    <div className="w-full mt-10 max-w-[1450px] mx-auto px-4 ">
      <header className="mb-8 mx-10">
        <h1 className="text-3xl font-bold">จัดทีมลงกิจกรรม</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
          {session?.role === 'admin'
            ? 'ลากและวางสมาชิก เพื่อจัดปาร์ตี้'
            : 'ดูรายชื่อสมาชิกและปาร์ตี้'}
        </p>
      </header>

      <Dashboard
        initialProfiles={profiles || []}
        isAdmin={session?.role === 'admin'}
      />
    </div>
  )
}
