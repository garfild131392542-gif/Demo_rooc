'use client'

import { Profile } from './Dashboard'
import MemberCard from './MemberCard'

export default function LeaveListBlock({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-[300px]">
      <div className="bg-rose-50 dark:bg-rose-900/30 p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg text-rose-900 dark:text-rose-100 flex items-center justify-between">
          <span>ลากิจกรรม</span>
          <span className="bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200 text-xs px-2 py-1 rounded-full">
            {profiles.length}
          </span>
        </h3>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {profiles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-10">No members on leave.</p>
        ) : (
          profiles.map(p => (
            // Pass isAdmin=false to force MemberCard to be non-draggable for LeaveList
            <MemberCard key={p.id} profile={p} isAdmin={false} />
          ))
        )}
      </div>
    </div>
  )
}
