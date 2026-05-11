'use client'

import { useDroppable } from '@dnd-kit/core'
import { Profile } from './Dashboard'
import MemberCard from './MemberCard'

export default function WaitlistBlock({ profiles, isAdmin }: { profiles: Profile[], isAdmin: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'waitlist',
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-[300px]">
      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 flex items-center justify-between">
          <span>รอจัดปาร์ตี้</span>
          <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs px-2 py-1 rounded-full">
            {profiles.length}
          </span>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-4 overflow-y-auto space-y-3 transition-colors ${isOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
      >
        {profiles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-10">No members in waitlist.</p>
        ) : (
          profiles.map(p => (
            <MemberCard key={p.id} profile={p} isAdmin={isAdmin} />
          ))
        )}
      </div>
    </div>
  )
}
