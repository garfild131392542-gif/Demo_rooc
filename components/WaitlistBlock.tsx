'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Profile } from './Dashboard'
import MemberCard from './MemberCard'

export default function WaitlistBlock({
  profiles,
  isAdmin,
  isEditMode = false,
  onMemberClick,
}: {
  profiles: Profile[]
  isAdmin: boolean
  isEditMode?: boolean
  onMemberClick?: (memberId: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const { isOver, setNodeRef } = useDroppable({
    id: 'waitlist',
  })

  // Filter by display name or job name
  const filteredProfiles = profiles.filter(p =>
    (p.display_name && p.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.job_name && p.job_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div 
      ref={setNodeRef} // 💡 ย้าย setNodeRef มาไว้ที่ div กล่องนอกสุดเลย
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border overflow-hidden flex flex-col flex-1 min-h-[300px] transition-colors ${
        isOver ? 'border-indigo-400 ring-2 ring-indigo-500/50 bg-indigo-50/30' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 flex items-center justify-between">
          <span>รอจัดปาร์ตี้</span>
          <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 text-xs px-2 py-1 rounded-full">
            {profiles.length}
          </span>
        </h3>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออาชีพ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
          <div className="absolute left-3 top-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {filteredProfiles.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-10">
            {searchTerm ? 'ไม่พบรายชื่อที่ค้นหา' : 'No members in waitlist.'}
          </p>
        ) : (
          filteredProfiles.map(p => (
            <MemberCard
              key={p.id}
              profile={p}
              isAdmin={isAdmin}
              isEditMode={isEditMode}
              onClick={onMemberClick ? () => onMemberClick(p.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}