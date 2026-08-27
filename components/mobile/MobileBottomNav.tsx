'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { logoutAction } from '@/app/actions/auth'
import { 
  Users, 
  Gavel, 
  Swords, 
  User, 
  LayoutGrid, 
  Menu, 
  X, 
  Shield, 
  CreditCard, 
  LogOut, 
  FileText, 
  Sparkles,
  Settings,
  ChevronRight,
  History
} from 'lucide-react'

interface SessionType {
  uid_game: string
  role: string
  display_name: string
  is_system_admin?: boolean
}

interface MobileBottomNavProps {
  enrichedSession: SessionType
  guildName?: string
  logoUrl?: string | null
}

export default function MobileBottomNav({ 
  enrichedSession, 
  guildName = 'ROOC Guild', 
  logoUrl 
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // 4 Main Tabs for the Bottom Bar (+ 1 More Menu Button)
  const mainTabs = [
    {
      id: 'party',
      name: 'จัดปาร์ตี้',
      href: '/',
      icon: LayoutGrid,
      isActive: pathname === '/',
    },
    {
      id: 'auction',
      name: 'ประมูล',
      href: '/auction',
      icon: Gavel,
      isActive: pathname.startsWith('/auction'),
    },
    {
      id: 'members',
      name: 'สมาชิก',
      href: '/members',
      icon: Users,
      isActive: pathname.startsWith('/members'),
    },
    {
      id: 'profile',
      name: 'ฉัน',
      href: '/profile',
      icon: User,
      isActive: pathname === '/profile',
    },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logoutAction()
    router.push('/login')
  }

  return (
    <>
      {/* 📱 Mobile Bottom Navigation Bar (Fixed at bottom on screens < lg) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[90] lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-colors pb-safe"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.isActive

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-1 group active:scale-95 transition-transform"
              >
                {/* Active Indicator Glow / Pill */}
                {active && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute top-1 w-10 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                <div 
                  className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                    active 
                      ? 'text-blue-600 dark:text-blue-400 font-bold' 
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                </div>

                <span 
                  className={`text-[10px] tracking-tight transition-all duration-200 ${
                    active 
                      ? 'font-bold text-blue-600 dark:text-blue-400 scale-105' 
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.name}
                </span>
              </Link>
            )
          })}

          {/* 🌟 More / Menu Trigger Tab */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 group active:scale-95 transition-transform cursor-pointer ${
              isMoreOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
              <Menu size={20} strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              เมนู
            </span>
          </button>
        </div>
      </nav>

      {/* 🌟 Slide-Up More Menu Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <div className="fixed inset-0 z-[120] lg:hidden">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden pb-safe"
            >
              {/* Sheet Drag Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Sheet Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden shrink-0 border border-blue-200 dark:border-blue-700">
                    {logoUrl ? (
                      <img src={logoUrl} alt={guildName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{guildName.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {enrichedSession.display_name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="truncate">{guildName}</span>
                      <span>•</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase text-[10px] bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {enrichedSession.role === 'admin' ? 'แอดมิน' : 'สมาชิก'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Sheet Menu List */}
              <div className="overflow-y-auto px-4 py-3 space-y-1 text-sm">
                
                {/* Secondary Feature Links */}
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                  ฟีเจอร์หลัก
                </div>

                <Link
                  href="/tactics"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                      <Swords size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">วางแผนกลยุทธ์ (Tactics)</div>
                      <div className="text-xs text-slate-400">กระดานวางแผน Guild War</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/profile/history"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                      <History size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">ประวัติคิวประมูล</div>
                      <div className="text-xs text-slate-400">ตรวจสอบคิวและการได้รับไอเทม</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/guild/edit"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      <Settings size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">ข้อมูลและตั้งค่ากิลด์</div>
                      <div className="text-xs text-slate-400">ชื่อกิลด์, Discord, Hall of Fame</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Admin Management Section */}
                {(enrichedSession.role === 'admin' || enrichedSession.is_system_admin) && (
                  <>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1.5">
                      ระบบผู้ดูแล (Admin)
                    </div>

                    {enrichedSession.role === 'admin' && (
                      <Link
                        href="/guild-admin/credentials"
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors group text-slate-700 dark:text-slate-200 border border-indigo-100 dark:border-indigo-900/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                            <Shield size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-indigo-900 dark:text-indigo-200">จัดการสมาชิกระบบ</div>
                            <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70">รีเซ็ตรหัสผ่าน, ลบสมาชิก, สเตตัส</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}

                    {enrichedSession.is_system_admin && (
                      <Link
                        href="/admin-control"
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors group text-slate-700 dark:text-slate-200 border border-rose-100 dark:border-rose-900/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-rose-900 dark:text-rose-200">แผงควบคุมระบบส่วนกลาง</div>
                            <div className="text-xs text-rose-600/70 dark:text-rose-400/70">Super Admin Dashboard</div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </>
                )}

                {/* System & Support Links */}
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-3 pb-1.5">
                  บริการและข้อกำหนด
                </div>

                <Link
                  href="/billing"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">สมาชิกและค่าบริการกิลด์</div>
                      <div className="text-xs text-slate-400">ตรวจสอบสถานะ PRO และต่ออายุ</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  href="/privacy-policy"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm">นโยบายความเป็นส่วนตัว</div>
                      <div className="text-xs text-slate-400">Privacy & Cookie Policy</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Logout Button */}
                <div className="pt-3 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false)
                      setShowLogoutConfirm(true)
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold transition-colors cursor-pointer border border-red-200 dark:border-red-800/50"
                  >
                    <LogOut size={18} />
                    <span>ออกจากระบบ (Logout)</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚪 Mobile Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xs p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <LogOut size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">ยืนยันการออกจากระบบ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">คุณต้องการลงชื่อออกจากระบบกิลด์ใช่หรือไม่</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? 'กำลังออก...' : 'ออกจากระบบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
