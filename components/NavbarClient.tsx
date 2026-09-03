'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

import MobileBottomNav from '@/components/mobile/MobileBottomNav'

type SessionType = {
    uid_game: string;
    role: string;
    display_name: string;
    is_system_admin?: boolean;
}

export default function NavbarClient({
    enrichedSession,
    initialGuildName = 'ROOC',
    initialLogoUrl = null,
}: {
    enrichedSession: SessionType;
    initialGuildName?: string;
    initialLogoUrl?: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false)
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    const [guildName, setGuildName] = useState(initialGuildName)
    const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)

    // 🌟 State สำหรับจัดการ Modal Logout
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    useEffect(() => {
        if (initialGuildName) setGuildName(initialGuildName)
        if (initialLogoUrl !== undefined) setLogoUrl(initialLogoUrl)
    }, [initialGuildName, initialLogoUrl])

    const isDarkMode = mounted && resolvedTheme === 'dark'

    const confirmLogout = async () => {
        setIsLoggingOut(true)
        await logoutAction()
        router.push('/login')
    }

    const toggleDarkMode = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    return (
        <>
            <nav className="sticky top-0 z-[100] bg-blue-600/95 dark:bg-slate-900/95 backdrop-blur-xl text-white shadow-md transition-colors border-b border-white/10">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16 lg:h-18">

                        {/* Brand Logo & Name */}
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <Link href="/" className="flex items-center hover:scale-102 transition-transform gap-2 py-1 min-w-0">
                                {logoUrl ? (
                                    <img src={logoUrl} alt={guildName} className="h-9 w-9 sm:h-12 sm:w-12 object-cover rounded-full border border-white/20 shadow-sm shrink-0" />
                                ) : (
                                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-white/20 flex items-center justify-center font-black text-sm shrink-0 border border-white/20">
                                        🛡️
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className="font-extrabold text-base sm:text-xl tracking-tight leading-tight truncate">
                                        {guildName}
                                    </span>
                                    <span className="text-[10px] text-blue-200 dark:text-blue-300 font-medium truncate sm:hidden">
                                        {enrichedSession.display_name} • {enrichedSession.role === 'admin' ? 'แอดมิน' : 'สมาชิก'}
                                    </span>
                                </div>
                            </Link>

                            {/* 🖥️ Desktop Main Navigation Links (Hidden on Mobile) */}
                            <div className="hidden lg:flex items-center gap-1 ml-2">
                                {[
                                    { name: 'จัดปาร์ตี้', href: '/' },
                                    { name: 'วางแผน', href: '/tactics' },
                                    { name: 'กิลด์', href: '/guild/edit' },
                                    { name: 'ข้อมูลส่วนตัว', href: '/profile' },
                                    { name: 'สมาชิก', href: '/members' },
                                    { name: 'คิวประมูล', href: '/profile/history' },
                                    { name: 'ประมูล', href: '/auction' },
                                ].map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/10 ${pathname === item.href ? 'bg-white/20 shadow-xs' : ''}`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                {enrichedSession.role === 'admin' && (
                                    <Link href="/guild-admin/credentials" className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 bg-indigo-500/30 border border-white/20">
                                        จัดการสมาชิก
                                    </Link>
                                )}
                                {enrichedSession.is_system_admin && (
                                    <Link href="/admin-control" className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/10 bg-rose-600/40 border border-rose-500/40 text-rose-200">
                                        แผงควบคุมระบบ
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Top Right Action Tools */}
                        <div className="flex items-center gap-1.5 sm:gap-3">
                            {/* Dark Mode Switch */}
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="cursor-pointer p-2 rounded-xl hover:bg-white/10 dark:hover:bg-gray-800 transition-colors focus:outline-none active:scale-95"
                                aria-label="Toggle Dark Mode"
                            >
                                <span className="sr-only">Toggle Dark Mode</span>
                                <div className="relative h-5 w-5 sm:h-6 sm:w-6">
                                    <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${isDarkMode ? 'rotate-[180deg] opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`}>
                                        <SunIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300" />
                                    </div>
                                    <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${isDarkMode ? 'rotate-0 opacity-100 scale-100' : 'rotate-[-180deg] opacity-0 scale-50'}`}>
                                        <MoonIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-300" />
                                    </div>
                                </div>
                            </button>

                            {/* 🖥️ Desktop User Info & Logout Button */}
                            <div className="hidden lg:flex items-center gap-3 border-l border-white/20 pl-3">
                                <span className="text-xs font-mono bg-black/20 px-2.5 py-1.5 rounded-xl border border-white/10">
                                    <span className="text-indigo-200 font-bold">{enrichedSession.display_name}</span>
                                    <span className="mx-1.5 opacity-40">|</span>
                                    <span>{enrichedSession.uid_game}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowLogoutModal(true)}
                                    className="cursor-pointer text-xs bg-red-600/90 hover:bg-red-600 py-1.5 px-3 rounded-xl font-bold text-white transition-all shadow-xs active:scale-95"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* 📱 Mobile Bottom Navigation Component */}
            <MobileBottomNav 
                enrichedSession={enrichedSession} 
                guildName={guildName} 
                logoUrl={logoUrl} 
            />

            {/* 🌟 5. Modal แจ้งเตือนก่อนออกจากระบบ (ใช้ Framer Motion ให้เด้งสมูทๆ) */}
            <AnimatePresence>
                {showLogoutModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-sm border border-gray-200 dark:border-slate-700"
                        >
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                                ยืนยันการออกจากระบบ
                            </h3>
                            <p className="text-gray-500 dark:text-slate-400 text-sm text-center mb-8">
                                คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบบัญชีของคุณ?
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    type="button"
                                    disabled={isLoggingOut}
                                    onClick={() => setShowLogoutModal(false)}
                                    className="cursor-pointer flex-1 py-3 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    disabled={isLoggingOut}
                                    onClick={confirmLogout}
                                    className="cursor-pointer flex-1 py-3 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                                >
                                    {isLoggingOut ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            รอสักครู่...
                                        </>
                                    ) : 'ออกจากระบบ'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}