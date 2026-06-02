import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await getSession()
  if (!session) redirect('/')

  const supabase = await createClient()
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', session.id)
    .maybeSingle()

  if (error || !admin) redirect('/')
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return <>{children}</>
}
