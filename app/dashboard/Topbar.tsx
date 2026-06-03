'use client'

interface TopbarProps {
  userDisplayName: string
}

export function Topbar({ userDisplayName }: TopbarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      {/* Page Title Placeholder */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* User Profile */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {userDisplayName.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userDisplayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Guild Admin</p>
        </div>
      </div>
    </div>
  )
}
