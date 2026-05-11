'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Profile } from './Dashboard'
import { useState } from 'react'

function getJobDiskColor(jobName: string) {
  const job = (jobName || '').toLowerCase()
  
  if (['knight', 'paladin'].includes(job)) {
    return 'bg-red-400'
  }
  if (['biochemist', 'whitesmith'].includes(job)) {
    return 'bg-orange-400'
  }
  if (['bard', 'gypsy', 'sniper'].includes(job)) {
    return 'bg-yellow-400'
  }
  if (['monk', 'priest'].includes(job)) {
    return 'bg-green-400'
  }
  if (['assasin', 'assassin', 'rogue'].includes(job)) {
    return 'bg-purple-400'
  }
  if (['wizard', 'sage'].includes(job)) {
    return 'bg-blue-400'
  }
  return 'bg-gray-300'
}

export default function MemberCard({ profile, isAdmin, isOverlay = false }: { profile: Profile, isAdmin?: boolean, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: profile.id,
    disabled: !isAdmin,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const [showPopup, setShowPopup] = useState(false)
  const diskColor = getJobDiskColor(profile.job_name)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative group bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
        ${isAdmin ? 'cursor-grab active:cursor-grabbing touch-none' : 'cursor-default'}
        ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2' : 'hover:shadow-md'}
        transition-shadow z-10`}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full ${diskColor} shrink-0`}></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {profile.display_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {profile.job_name || 'No Job'}
          </p>
        </div>
      </div>

      {/* Hover Popup */}
      {showPopup && !isOverlay && (
        <div className="absolute left-full ml-2 top-0 w-48 p-4 bg-gray-900 text-white rounded-lg shadow-xl z-50 pointer-events-none transform -translate-y-2 opacity-100 transition-opacity">
          <div className="flex flex-col items-center space-y-2">
            <div className={`w-16 h-16 rounded-full ${diskColor} mb-1`}></div>
            <p className="font-bold text-center">{profile.display_name}</p>
            <div className="w-full mt-2 text-sm grid grid-cols-2 gap-2 text-center border-t border-gray-700 pt-2">
              <div>
                <p className="text-gray-400 text-xs">PvP Reduc</p>
                <p className="font-medium text-emerald-400">{profile.pvp_reduc}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">PvP DMG</p>
                <p className="font-medium text-rose-400">{profile.pvp_dmg}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
