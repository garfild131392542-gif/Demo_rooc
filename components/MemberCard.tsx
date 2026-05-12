'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Profile } from './Dashboard'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

function getJobDiskColor(jobName: string) {
  const job = (jobName || '').toLowerCase()

  if (['knight', 'lord knight', 'paladin'].includes(job)) {
    return 'bg-red-400'
  }
  if (['biochemist', 'mastersmith'].includes(job)) {
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

export default function MemberCard({ profile, isAdmin, isOverlay = false, onClick }: { profile: Profile, isAdmin?: boolean, isOverlay?: boolean, onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: profile.id,
    disabled: !isAdmin,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const [showPopup, setShowPopup] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const diskColor = getJobDiskColor(profile.job_name)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    // Position TOP horizontally centered
    setCoords({ x: rect.left + (rect.width / 2), y: rect.top - 8 })
    setShowPopup(true)
  }

  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    cardRef.current = node
  }

  return (
    <div
      ref={setRefs}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative group bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 
        ${isAdmin && !onClick ? 'cursor-grab active:cursor-grabbing touch-none' : ''}
        ${onClick ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500' : ''}
        ${!isAdmin && !onClick ? 'cursor-default' : ''}
        ${isOverlay ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2' : 'hover:shadow-md'}
        transition-shadow z-10`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowPopup(false)}
      onClick={onClick}
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

      {/* Hover Popup using Portal to escape overflow-hidden containers */}
      {showPopup && !isOverlay && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed w-36 p-2 bg-gray-900 text-white rounded shadow-lg z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full opacity-100 transition-opacity"
          style={{ top: coords.y, left: coords.x }}
        >
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full ${diskColor} mb-1`}></div>
            <p className="font-bold text-center text-xs truncate w-full px-1">{profile.display_name}</p>
            <div className="w-full mt-1 text-[10px] grid grid-cols-2 gap-1 text-center border-t border-gray-700 pt-1">
              <div>
                <p className="text-gray-400">PvP Reduc</p>
                <p className="font-medium text-emerald-400">{profile.pvp_reduc}</p>
              </div>
              <div>
                <p className="text-gray-400">PvP DMG</p>
                <p className="font-medium text-rose-400">{profile.pvp_dmg}</p>
              </div>
            </div>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </div>
  )
}
