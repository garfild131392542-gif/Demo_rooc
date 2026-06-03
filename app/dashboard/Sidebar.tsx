'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  guildName: string
}

export function Sidebar({ guildName }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/members', label: 'Members', icon: '👥' },
    { href: '/guild-admin', label: 'Settings', icon: '⚙️' },
    { href: '/billing', label: 'Billing', icon: '💳' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col shadow-lg">
      {/* Guild Name Header */}
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white truncate">{guildName}</h2>
        <p className="text-xs text-gray-400 mt-1">Guild Management</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </div>
  )
}
