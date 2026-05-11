import { getSession } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.id)
    .single()

  if (error || !profile) {
    return <div className="p-8 text-red-500">Error loading profile data.</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <ProfileForm initialProfile={profile} />
    </div>
  )
}
