'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
// 🌟 นำเข้า Supabase Client สำหรับฝั่ง Client Component
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

type SessionType = {
    uid_game: string;
    role: string;
    display_name: string;
}

export default function NavbarClient({ enrichedSession }: { enrichedSession: SessionType }) {
    const [isOpen, setIsOpen] = useState(false)
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    
    // 🌟 เพิ่ม State สำหรับเก็บชื่อกิลด์เริ่มต้นด้วยสถานะโหลดข้อมูล
    const [guildName, setGuildName] = useState('กำลังโหลด...')
    
    const router = useRouter()
    const pathname = usePathname()

   useEffect(() => {
        setMounted(true)
    }, [])

    
    useEffect(() => {
        setIsOpen(false)
    }, [pathname]) 



    // 🌟 ดึงข้อมูลชื่อกิลด์แบบ Dynamic จากความสัมพันธ์ตาราง profiles -> guilds
    useEffect(() => {
        if (!mounted) return

        async function fetchGuildData() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // ยิงคำสั่ง Join Table เพื่อแกะเอาชื่อกิลด์ออกมา
                const { data: profile,error } = await supabase
                    .from('profiles')
                    .select('guild_id, guilds(name)') // 💡 แนะนำให้ตรวจเช็คชื่อคอลัมน์ในตาราง guilds ของคุณอีกทีนะครับ (เช่น name หรือ guild_name)
                    .eq('id', user.id)
                    .maybeSingle() as { data: { guild_id: string | null; guilds: any } | null; error: any }

                    if (error) {
                    console.error('Navbar database query error:', error.message)
                    setGuildName('ข้อผิดพลาดระบบ')
                    return
                }

                if (profile?.guilds) {
                    const guildData = profile.guilds as any
                    // ตรวจสอบและดึงค่าจากคอลัมน์ name
                    const finalName = Array.isArray(guildData) ? guildData[0]?.name : guildData?.name
                    
                    if (finalName) {
                        setGuildName(finalName)
                    } else {
                        setGuildName('ไม่มีกิลด์')
                    }
                } else {
                    setGuildName('ยังไม่มีกิลด์')
                }
            } catch (err) {
                console.error('Error fetching guild name:', err)
                setGuildName('ROOC')
            }
        }

        fetchGuildData()
    }, [mounted, pathname])


    const isDarkMode = mounted && resolvedTheme === 'dark'

    const handleLogout = async (e: React.FormEvent) => {
        e.preventDefault()
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
        <nav className="sticky top-0 z-[100] bg-blue-500/90 dark:bg-gray-900/90 backdrop-blur-md text-white shadow-lg transition-colors border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    <div className="flex items-center">
                        {/* 🌟 แสดงชื่อกิลด์ที่ดึงมาจากฐานข้อมูลแบบเรียลไทม์ */}
                        <Link href="/" className="gap-1 flex items-center font-bold text-xl tracking-tighter hover:scale-105 transition-transform">
                            {guildName}<span className="gap-1 ml-1 text-indigo-200">Guild</span>
                        </Link>

                        <div className="hidden md:flex ml-10 space-x-1">
                            {[
                                { name: 'Dashboard', href: '/' },
                                { name: 'Guild', href: '/guild/edit' },
                                { name: 'My Profile', href: '/profile' },
                                { name: 'Members', href: '/members' },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 ${pathname === item.href ? 'bg-white/20' : ''}`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            {enrichedSession.role === 'admin' && (
                                <Link href="/guild-admin/credentials" className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 bg-indigo-500/30 border border-white/20">
                                    จัดการข้อมูลสมาชิกกิล
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 md:space-x-4 pl-4">
                        {/* Dark Mode Switch */}
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            className="cursor-pointer relative p-2 rounded-full hover:bg-white/10 dark:hover:bg-gray-800 transition-colors focus:outline-none active:scale-95"
                            aria-label="Toggle Dark Mode"
                        >
                            <span className="sr-only">Toggle Dark Mode</span>

                            <div className="relative h-6 w-6">
                                <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${isDarkMode ? 'rotate-[180deg] opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'}`}>
                                    <SunIcon className="h-6 w-6 text-yellow-300" />
                                </div>
                                <div className={`absolute inset-0 transition-transform duration-500 ease-in-out ${isDarkMode ? 'rotate-0 opacity-100 scale-100' : 'rotate-[-180deg] opacity-0 scale-50'}`}>
                                    <MoonIcon className="h-6 w-6 text-indigo-300" />
                                </div>
                            </div>
                        </button>

                        <div className="hidden md:flex items-center space-x-4 border-l border-white/20 pl-4">
                            <div className="flex items-center space-x-1">
                                <span className="text-xs font-mono opacity-80 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                                    <span className="text-indigo-200">{enrichedSession.display_name}</span>
                                    <span className="mx-1 opacity-40">|</span>
                                    <span>{enrichedSession.uid_game}</span>
                                </span>
                            </div>
                            <form onSubmit={handleLogout}>
                                <button type="submit" className="hover cursor-pointer text-sm bg-red-600/95 py-1 px-2 rounded font-semibold text-red-200 hover:text-white hover:bg-red-600/10 transition-colors">
                                    Logout
                                </button>
                            </form>
                        </div>

                        {/* Animated Hamburger Button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95"
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
                        className="md:hidden overflow-hidden bg-gray-700/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-white/10"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {[
                                { name: 'Dashboard', href: '/' },
                                { name: 'Guild', href: '/guild/edit' },
                                { name: 'My Profile', href: '/profile' },
                                { name: 'Members', href: '/members' },
                                ...(enrichedSession.role === 'admin' ? [{ name: 'จัดการข้อมูลสมาชิกกิล', href: '/guild-admin/credentials' }] : [])
                            ].map((item) => (
                                <motion.div key={item.name} variants={itemVariants}>
                                    <Link
                                        href={item.href}
                                        className="block px-4 py-3 rounded-xl text-lg font-medium hover:bg-white/10 active:bg-white/20 transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                </motion.div>
                            ))}

                            <motion.div variants={itemVariants} className="pt-4 mt-4 border-t border-white/10">
                                <div className="px-4 text-xs opacity-50 mb-4">
                                    Logged in as: {enrichedSession.uid_game} ({enrichedSession.role})
                                </div>
                                <form onSubmit={handleLogout}>
                                    <button type="submit" className="cursor-pointer w-[100px] py-4 rounded-xl bg-red-500 text-white font-bold border border-red-500 active:scale-95 transition-all">
                                        Logout
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}