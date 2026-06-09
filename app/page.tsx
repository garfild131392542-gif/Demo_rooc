import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import type { Guild } from '@/types/database'
import { redirect } from 'next/navigation' // 🌟 1. อย่าลืม import redirect

function calculateDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0

  const endDate = new Date(trialEndsAt)
  const now = new Date()
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.max(0, daysRemaining)
}

export default async function HomePage() {
  const session = await getSession()
  const sessionAny = session as any
  const supabase = await createClient()

  let profiles: any[] = []
  let trialDaysRemaining = 0
  let isAdmin = false

  // 💡 ดึงข้อมูลเฉพาะตอนที่มี session (ล็อกอินแล้ว) เท่านั้น
  if (session) {
    const myGuildId = sessionAny?.profile?.guild_id

    // 🌟 2. เพิ่ม Logic ตรงนี้: ถ้าไม่มีกิลด์ ให้เด้งไปหน้า profile-setup ทันที!
    if (!myGuildId) {
      redirect('/profile-setup')
    }

    // ถ้าผ่านเงื่อนไขด้านบนมาได้ แปลว่ามีกิลด์แล้ว ให้ทำงานตามปกติ
    isAdmin = sessionAny?.profile?.role === 'admin'

    const profilesQuery = supabase
      .from('profiles')
      .select('*')
      .eq('guild_id', myGuildId)
      .order('id', { ascending: true })

    const guildQuery = supabase
      .from('guilds')
      .select('trial_ends_at')
      .eq('id', myGuildId)
      .maybeSingle()

    const [profilesResult, guildResult] = await Promise.all([
      profilesQuery,
      guildQuery,
    ])

    if (profilesResult.error) {
      console.error('Error fetching profiles:', profilesResult.error.message)
    } else {
      profiles = profilesResult.data || []
    }

    const guildData = (guildResult.data ?? null) as Guild | null
    if (guildData?.trial_ends_at) {
      trialDaysRemaining = calculateDaysRemaining(guildData.trial_ends_at)
    }
  } else {
    // 🌟 3. (เสริม) ถ้ายังไม่ล็อกอิน ให้เด้งไปหน้า login
    redirect('/login')
  }

  return (
    <div className="w-full mt-10 max-w-[1450px] mx-auto px-4 ">
      {/* Trial Countdown Banner */}
      {session && trialDaysRemaining > 0 && isAdmin && (
        <div className="mb-6 mx-10 bg-linear-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-lg px-6 py-4 flex items-center justify-between">
          {/* Full Banner - Hidden on sm/md, visible on lg */}
          <div className="hidden lg:flex items-center gap-3 flex-1">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-blue-800 font-semibold">
                เหลือเวลาทดลองใช้งานอีก {trialDaysRemaining} วัน
              </p>
              <p className="text-blue-700 text-sm">
                เมื่อสิ้นสุดการทดลอง คุณจะต้องซื้อแผนใดแผนหนึ่งเพื่อให้กิลด์ของคุณอยู่ในสถานะใช้งาน
              </p>
            </div>
          </div>

          {/* Button Only - Visible on sm/md */}
          <div className="lg:hidden w-full">
            <a href="/billing" className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
              จัดการการเรียกเก็บเงิน
            </a>
          </div>

          {/* Button on Full Banner - lg and above */}
          <a href="/billing" className="hidden lg:block shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
            จัดการการเรียกเก็บเงิน
          </a>
        </div>
      )}

      <header className="mb-8 mx-10">
        <h1 className="text-3xl font-bold">จัดทีมลงกิจกรรม</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">
          {isAdmin
            ? 'ลากและวางสมาชิก เพื่อจัดปาร์ตี้'
            : 'ดูรายชื่อสมาชิกและปาร์ตี้'}
        </p>
      </header>

      <Dashboard
        initialProfiles={profiles}
        isAdmin={isAdmin}
      />
    </div>
  )
}