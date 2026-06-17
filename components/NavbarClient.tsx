'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

type SessionType = {
    uid_game: string;
    role: string;
    display_name: string;
}

export default function NavbarClient({ enrichedSession }: { enrichedSession: SessionType }) {
    const [isOpen, setIsOpen] = useState(false)
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    
    const [guildName, setGuildName] = useState('กำลังโหลด...')
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    
    // 🌟 1. เพิ่ม State สำหรับจัดการ Modal Logout
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
        if (!mounted) return

        async function fetchGuildData() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('guild_id, guilds(name, logo_url)') 
                    .eq('id', user.id)
                    .maybeSingle() as any

                if (error) {
                    console.error('Navbar database query error:', error.message)
                    setGuildName('ข้อผิดพลาดระบบ')
                    return
                }

                if (profile?.guilds) {
                    const guildData = profile.guilds as any
                    const finalName = Array.isArray(guildData) ? guildData[0]?.name : guildData?.name
                    const finalLogo = Array.isArray(guildData) ? guildData[0]?.logo_url : guildData?.logo_url
                    
                    if (finalName) {
                        setGuildName(finalName)
                    } else {
                        setGuildName('ไม่มีกิลด์')
                    }
                    setLogoUrl(finalLogo || null)
                } else {
                    setGuildName('ยังไม่มีกิลด์')
                    setLogoUrl(null)
                }
            } catch (err) {
                console.error('Error fetching guild name:', err)
                setGuildName('ROOC')
                setLogoUrl(null)
            }
        }

        fetchGuildData()
    }, [mounted, pathname])

    const isDarkMode = mounted && resolvedTheme === 'dark'

    // 🌟 2. ปรับฟังก์ชันให้ทำงานเมื่อกดยืนยันใน Modal
    const confirmLogout = async () => {
        setIsLoggingOut(true)
        await logoutAction()
        router.push('/login')
    }

    const toggleDarkMode = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    const menuVariants = {
        closed: {
            opacity: 0,
            height: 0,
            transition: { duration: 0.1, ease: 'easeInOut', when: "afterChildren" }
        },
        open: {
            opacity: 1,
            height: 'auto',
            transition: { duration: 0.2, ease: 'easeInOut', when: "beforeChildren" }
        }
    } as any

    const itemVariants = {
        closed: { x: -20, opacity: 0 },
        open: { x: 0, opacity: 1 }
    } as any

    return (
        <>
            <nav className="sticky top-0 z-[100] bg-guild-primary/95 dark:bg-gray-900/95 backdrop-blur-md text-white shadow-lg transition-colors border-b border-white/10">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex justify-between h-16 sm:h-18">

                        <div className="flex items-center sm:gap-4">
                            <div>
                                <Link href="/" className="flex items-center hover:scale-105 transition-transform gap-2 py-1">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={guildName} className="h-8 sm:h-10 w-auto object-contain rounded" />
                                    ) : (
                                        <span className="font-bold text-2xl sm:text-2xl tracking-tighter flex items-center">
                                            {guildName}<span className="ml-1 text-indigo-200 sm:text-xl">Guild</span>
                                        </span>
                                    )}
                                </Link>
                            </div>

                            <div className="hidden sm:flex gap-1">
                                {[
                                    { name: 'Dashboard', href: '/' },
                                    { name: 'Guild', href: '/guild/edit' },
                                    { name: 'My Profile', href: '/profile' },
                                    { name: 'Queue History', href: '/profile/history' },
                                    { name: 'Members', href: '/members' },
                                    { name: 'Auction', href: '/auction' },
                                ].map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-white/10 ${pathname === item.href ? 'bg-white/20' : ''}`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                {enrichedSession.role === 'admin' && (
                                    <Link href="/guild-admin/credentials" className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-white/10 bg-indigo-500/30 border border-white/20">
                                        จัดการสมาชิก
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 pl-2 sm:pl-4">
                            {/* Dark Mode Switch */}
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="cursor-pointer relative p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-800 transition-colors focus:outline-none active:scale-95"
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

                            <div className="hidden sm:flex items-center gap-2 lg:gap-4 border-l border-white/20 pl-2 lg:pl-4">
                                <div className="hidden lg:flex items-center space-x-1">
                                    <span className="text-xs font-mono opacity-80 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                                        <span className="text-indigo-200">{enrichedSession.display_name}</span>
                                        <span className="mx-1 opacity-40">|</span>
                                        <span className="hidden lg:inline">{enrichedSession.uid_game}</span>
                                    </span>
                                </div>
                                {/* 🌟 3. เปลี่ยนจาก Form เป็นปุ่มเปิด Modal ธรรมดา (สำหรับ Desktop) */}
                                <button 
                                    type="button" 
                                    onClick={() => setShowLogoutModal(true)} 
                                    className="hover cursor-pointer text-xs sm:text-sm bg-red-600/95 py-1 px-2 sm:px-3 rounded font-semibold text-red-200 hover:text-white hover:bg-red-600/10 transition-colors"
                                >
                                    Logout
                                </button>
                            </div>

                            {/* Animated Hamburger Button */}
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="sm:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
                            >
                                <div className="w-6 h-5 relative flex flex-col justify-between items-center">
                                    <motion.span
                                        animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                                        className="w-full h-0.5 bg-white rounded-full origin-center"
                                    />
                                    <motion.span
                                        animate={isOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                                        className="w-full h-0.5 bg-white rounded-full"
                                    />
                                    <motion.span
                                        animate={isOpen ? { rotate: -45, y: -10 } : { rotate: 0, y: 0 }}
                                        className="w-full h-0.5 bg-white rounded-full origin-center"
                                    />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu with Framer Motion */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={menuVariants}
                            className="sm:hidden overflow-hidden bg-gray-700/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-white/10"
                        >
                            <div className="px-4 pb-6 space-y-2">
                                {[
                                    { name: 'Dashboard', href: '/' },
                                    { name: 'Guild', href: '/guild/edit' },
                                    { name: 'My Profile', href: '/profile' },
                                    { name: 'Queue History', href: '/profile/history' },
                                    { name: 'Members', href: '/members' },
                                    { name: 'Auction', href: '/auction' },
                                    ...(enrichedSession.role === 'admin' ? [{ name: 'จัดการข้อมูลสมาชิกกิล', href: '/guild-admin/credentials' }] : [])
                                ].map((item) => (
                                    <motion.div key={item.name} variants={itemVariants}>
                                        <Link
                                            href={item.href}
                                            className="block px-4 py-3 rounded-xl text-md font-medium hover:bg-white/10 active:bg-white/20 transition-colors"
                                        >
                                            {item.name}
                                        </Link>
                                    </motion.div>
                                ))}

                                <motion.div variants={itemVariants} className="pt-4 mt-4 border-t border-white/10">
                                    <div className="px-4 text-xs opacity-50 mb-4">
                                        Logged in as: {enrichedSession.uid_game} ({enrichedSession.role})
                                    </div>
                                    {/* 🌟 4. เปลี่ยนจาก Form เป็นปุ่มเปิด Modal ธรรมดา (สำหรับ Mobile) */}
                                    <button 
                                        type="button" 
                                        onClick={() => setShowLogoutModal(true)} 
                                        className="cursor-pointer w-[100px] py-4 rounded-xl bg-red-500 text-white font-bold border border-red-500 active:scale-95 transition-all"
                                    >
                                        Logout
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

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