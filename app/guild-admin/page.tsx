import { createAdminClient } from '@/lib/supabase/server' // ปรับ path
import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'

export default async function GuildAdminPage() {
  // ใช้ session ที่ได้จาก cookie-based auth
  const session = await getSession()
  if (!session) redirect('/login')

  // ตรวจสอบสิทธิ์บนเซิร์ฟเวอร์ก่อนเรียก DB
  if (session.role !== 'guild_master' && session.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-red-500 font-bold">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะระดับแอดมินหรือหัวหน้ากิลด์)
        </div>
      </div>
    )
  }

  const supabase = await createAdminClient()

  // ดึงข้อมูลรายละเอียดกิลด์ (เพื่อเอา Invite Code)
  const { data: guild } = await supabase
    .from('guilds')
    .select('*')
    .eq('id', session.guild_id)
    .maybeSingle()

  // ดึงรายชื่อสมาชิกทั้งหมดในกิลด์นี้
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('guild_id', session.guild_id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header กิลด์ & โค้ดเชิญ */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">จัดการกิลด์: {guild?.name}</h1>
            <span className="inline-block mt-2 px-3 py-1 bg-sky-100 text-blue-700 text-sm font-bold rounded-full">
              Server: {guild?.server_name}
            </span>
          </div>

          <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center w-full md:w-auto">
            <p className="text-sm text-slate-500 font-medium mb-1">คัดลอกโค้ดนี้ส่งให้เพื่อนเพื่อเข้าร่วมกิลด์</p>
            <div className="text-2xl font-black text-blue-600 tracking-wider bg-white py-2 px-6 rounded-lg shadow-sm border border-blue-100">
              {guild?.invite_code}
            </div>
          </div>
        </div>

        {/* รายชื่อสมาชิก */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            👥 รายชื่อสมาชิก ({members?.length || 0} คน)
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="pb-3 text-sm font-bold text-slate-400">ชื่อตัวละคร</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">ตำแหน่ง</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">วันที่เข้าร่วม</th>
                  <th className="pb-3 text-sm font-bold text-slate-400 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {members?.map((member: any) => (
                  <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">
                      {member.display_name || 'ไม่ระบุชื่อ'}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                        member.role === 'guild_master' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {member.role === 'guild_master' ? 'Guild Master' : 'Member'}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-slate-500">
                      {new Date(member.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="py-4 text-right">
                      {member.role !== 'guild_master' && (
                        <button className="text-red-500 hover:text-red-700 text-sm font-medium bg-red-50 px-3 py-1 rounded-lg transition-colors">
                          เตะออก
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}