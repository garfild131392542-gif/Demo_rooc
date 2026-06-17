import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const sessionAny = session as any

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionAny.user?.id ?? sessionAny.id)
    .single()

  if (error || !profile) {
    return <div className="p-8 text-red-500">Error loading profile data.</div>
  }

  // ดึงข้อมูลกิลด์ของผู้ใช้เพื่อเช็คสิทธิ์ทำเนียบเกียรติยศ (Hall of Fame)
  let isEligibleForShowcase = false
  if (profile.guild_id) {
    const { data: guild } = await supabase
      .from('guilds')
      .select('hall_of_fame_gold_uid, hall_of_fame_silver_uid, hall_of_fame_bronze_uid')
      .eq('id', profile.guild_id)
      .maybeSingle()

    if (guild) {
      const isSelected = 
        profile.id === guild.hall_of_fame_gold_uid ||
        profile.id === guild.hall_of_fame_silver_uid ||
        profile.id === guild.hall_of_fame_bronze_uid

      isEligibleForShowcase = isSelected
    }
  }

  return (
    <div className="w-full mx-auto px-4 py-8">
      <ProfileForm 
        initialProfile={{
          ...profile,
          uid_game: profile.uid_game || '', // ถ้าเป็น null ให้ใส่เป็นข้อความว่างๆ แทน
          display_name: profile.display_name || '',
        } as any} 
        isEligibleForShowcase={isEligibleForShowcase}
      />
    </div>
  )
}
