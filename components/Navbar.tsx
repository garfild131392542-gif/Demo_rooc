import Link from 'next/link'
import { getSession, logoutAction } from '@/app/actions/auth'
import { redirect } from 'next/navigation'

export default async function Navbar() {
  const session = await getSession()
  if (!session) return null

  return (
    <nav className="bg-indigo-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="font-bold text-xl tracking-wider">
              Explorers Guild
            </Link>
            <div className="flex space-x-4">
              <Link href="/" className="hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/profile" className="hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                My Profile
              </Link>
              <Link href="/members" className="hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                Members
              </Link>
              {session.role === 'admin' && (
                <>
                  <Link href="/admin/credentials" className="hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium">
                    ศูนย์จัดการสมาชิกกิล
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium opacity-80">
              {session.uid_game} ({session.role})
            </span>
            <form action={async () => {
              'use server'
              await logoutAction()
              redirect('/login')
            }}>
              <button type="submit" className="bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
