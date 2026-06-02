import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'
import GuildsApprovalTable from './GuildsApprovalTable'

/**
 * Admin Dashboard - Guild Approval Page
 * 
 * เพจนี้สำหรับแอดมินในการตรวจสอบและอนุมัติกิลด์ที่ขอสมัครใหม่
 * - ตรวจสอบสิทธิ์ว่าผู้ใช้เป็นแอดมินหรือไม่
 * - ดึงข้อมูลกิลด์ที่รอการอนุมัติ (status = 'pending')
 * - แสดงผลในรูปแบบตาราง
 */

export default async function AdminDashboardPage() {
  // 1. ตรวจสอบการล็อกอิน
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  const sessionAny = session as any

  // 2. ตรวจสอบสิทธิ์แอดมินจากตาราง public.admins
  const supabase = await createClient()
  const { data: adminCheck, error: adminError } = await supabase
    .from('admins')
    .select('id')
    .eq('id', sessionAny.user.id)
    .maybeSingle()

  if (adminError) {
    console.error('Error checking admin permission:', adminError)
    redirect('/')
  }

  if (!adminCheck) {
    redirect('/')
  }

  // 3. ดึงข้อมูลกิลด์ที่รอการอนุมัติ
  const { data: pendingGuilds, error: guildsError } = await supabase
    .from('guilds')
    .select(`
      id,
      name,
      server_name,
      owner_id,
      status,
      created_at,
      profiles!owner_id (
        id,
        display_name,
        email
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (guildsError) {
    console.error('Error fetching pending guilds:', guildsError)
  }

  const guilds = (pendingGuilds || []).map((guild: any) => ({
    ...guild,
    profiles: Array.isArray(guild.profiles) ? guild.profiles[0] : guild.profiles,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ภาคแอดมิน - อนุมัติกิลด์
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            ตรวจสอบและอนุมัติคำขอสร้างกิลด์ใหม่
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              รอการอนุมัติ
            </div>
            <div className="text-3xl font-bold text-blue-600">{guilds.length}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              ผู้ใช้ปัจจุบัน
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {sessionAny.user?.email || 'ไม่ระบุ'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              ระดับสิทธิ์
            </div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {sessionAny.profile?.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
            </div>
          </div>
        </div>

        {/* Guilds Approval Table */}
        <GuildsApprovalTable initialGuilds={guilds} />
      </div>
    </div>
  )
}
