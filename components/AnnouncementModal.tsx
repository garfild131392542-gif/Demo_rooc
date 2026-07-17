'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
type AnnouncementProp = {
  id: string
  title: string
  subtitle?: string | null
  items: Array<{
    icon: string
    label: string
    detail: string
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
    youtubeUrl?: string | null
  }>
  footer?: string | null
}

type Props = {
  announcement: AnnouncementProp
}

const COLOR_MAP: Record<AnnouncementProp['items'][0]['color'], { bg: string; border: string; icon: string; badge: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',     border: 'border-blue-200 dark:border-blue-800/50',     icon: 'bg-blue-100 dark:bg-blue-900/50',     badge: 'text-blue-700 dark:text-blue-300' },
  green:  { bg: 'bg-green-50 dark:bg-green-950/30',   border: 'border-green-200 dark:border-green-800/50',   icon: 'bg-green-100 dark:bg-green-900/50',   badge: 'text-green-700 dark:text-green-300' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800/50', icon: 'bg-yellow-100 dark:bg-yellow-900/50', badge: 'text-yellow-700 dark:text-yellow-300' },
  red:    { bg: 'bg-red-50 dark:bg-red-950/30',       border: 'border-red-200 dark:border-red-800/50',       icon: 'bg-red-100 dark:bg-red-900/50',       badge: 'text-red-700 dark:text-red-300' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800/50', icon: 'bg-purple-100 dark:bg-purple-900/50', badge: 'text-purple-700 dark:text-purple-300' },
}

/** แปลง YouTube URL ทุกรูปแบบ → Video ID */
function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    // youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('?')[0] || null
    }
    // youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v')
    }
    return null
  } catch {
    return null
  }
}

function getStorageKey(id: string) {
  return `announcement-seen-${id}`
}

function hasSeenToday(id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(getStorageKey(id))
    if (!raw) return false
    const today = new Date().toDateString()
    return raw === today
  } catch {
    return false
  }
}

function markSeenToday(id: string) {
  try {
    const today = new Date().toDateString()
    localStorage.setItem(getStorageKey(id), today)
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────
// YouTube Thumbnail Card (คลิกเปิด YouTube)
// ────────────────────────────────────────────────
function YouTubeCard({ url }: { url: string }) {
  const videoId = extractYouTubeId(url)
  if (!videoId) return null

  const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="group relative mt-2.5 block w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
      aria-label="ดูวิดีโอสอนบน YouTube"
    >
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl}
        alt="YouTube tutorial thumbnail"
        className="w-full object-cover aspect-video"
        loading="lazy"
      />

      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600 shadow-lg group-hover:scale-110 transition-transform">
          <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-2">
        <svg className="w-3.5 h-3.5 fill-red-500 shrink-0" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.82 4.83 4.83 0 00-4.83 4.83V19.2a.8.8 0 00.8.8h6.4a.8.8 0 00.8-.8V7.49a.8.8 0 00-.8-.8h-.6zM3 6.69a4.83 4.83 0 003.77-2.82 4.83 4.83 0 014.83 4.83V19.2a.8.8 0 01-.8.8H4.4a.8.8 0 01-.8-.8V7.49a.8.8 0 01.8-.8H3z"/>
        </svg>
        <span className="text-white text-[10px] font-bold tracking-wide drop-shadow">
          ▶ ดูวิดีโอสอนการตั้งค่าบน YouTube
        </span>
      </div>
    </a>
  )
}

// ────────────────────────────────────────────────
// Main Modal
// ────────────────────────────────────────────────
export default function AnnouncementModal({ announcement }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [suppressToday, setSuppressToday] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // ตรวจสอบ flag โดยไม่ลบออกก่อน
    // (React Strict Mode dev รัน effect 2 รอบ — ถ้าลบใน effect body
    //  รอบแรกจะลบ flag ทิ้ง รอบสองไม่เจอ flag แล้ว → modal ไม่เด้ง)
    const justLoggedIn = sessionStorage.getItem('just-logged-in')
    if (!justLoggedIn) return

    if (hasSeenToday(announcement.id)) return

    // ย้าย removeItem เข้าไปใน timer callback
    // ถ้า cleanup ยกเลิก timer → flag ยังอยู่ให้ effect รอบใหม่อ่านได้
    const timer = setTimeout(() => {
      sessionStorage.removeItem('just-logged-in')
      setIsOpen(true)
    }, 800)

    return () => clearTimeout(timer)
  }, [pathname, announcement.id])

  const handleClose = () => {
    // บันทึก "เห็นแล้ว" เฉพาะเมื่อผู้ใช้ติ๊ก checkbox
    if (suppressToday) {
      markSeenToday(announcement.id)
    }
    setIsOpen(false)
  }

  const { title, subtitle, items, footer } = announcement

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="announcement-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <motion.div
            key="announcement-panel"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header gradient bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
              aria-label="ปิด"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Title */}
              <div className="pr-6">
                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2.5">
                {items.map((item, i) => {
                  const c = COLOR_MAP[item.color]
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      className={`p-3.5 rounded-2xl border ${c.bg} ${c.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-lg ${c.icon}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${c.badge} mb-0.5`}>{item.label}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                      </div>

                      {/* YouTube thumbnail — แสดงเมื่อมี youtubeUrl */}
                      {item.youtubeUrl && (
                        <YouTubeCard url={item.youtubeUrl} />
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Footer */}
              {footer && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium pt-1">
                  {footer}
                </p>
              )}
            </div>

            {/* Sticky confirm button + checkbox */}
            <div className="p-4 pt-0 shrink-0 space-y-3">
              {/* Suppress checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer group w-fit mx-auto">
                <div className="relative flex items-center justify-center">
                  <input
                    id="suppress-today"
                    type="checkbox"
                    checked={suppressToday}
                    onChange={(e) => setSuppressToday(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
                    ${suppressToday
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'
                    }`}
                  >
                    {suppressToday && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                  ไม่ต้องแสดงการแจ้งเตือนนี้อีกวันนี้
                </span>
              </label>

              <button
                onClick={handleClose}
                className="cursor-pointer w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20"
              >
                รับทราบแล้ว ✓
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
