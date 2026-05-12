'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'
import { useTheme } from 'next-themes'

type SessionType = {
    uid_game: string;
    role: string;
}

export default function NavbarClient({ session }: { session: SessionType }) {
    const [isOpen, setIsOpen] = useState(false)
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    // ป้องกัน Hydration Mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDarkMode = mounted && resolvedTheme === 'dark'

    // ฟังก์ชันสลับ Dark Mode ด้วย next-themes
    const toggleDarkMode = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    // ฟังก์ชันจัดการ Logout ฝั่ง Client
    const handleLogout = async (e: React.FormEvent) => {
        e.preventDefault()
        await logoutAction()
        router.push('/login')
    }

    return (
        <nav className="bg-indigo-600 dark:bg-gray-900 text-white shadow-md transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* ส่วนโลโก้ และ เมนูแนวนอน (Desktop) */}
                    <div className="flex items-center">
                        <Link href="/" className="font-bold text-xl tracking-wider mr-8">
                            Explorers Guild
                        </Link>

                        <div className="hidden md:flex space-x-4">
                            <Link href="/" className="hover:bg-indigo-500 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/profile" className="hover:bg-indigo-500 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                My Profile
                            </Link>
                            <Link href="/members" className="hover:bg-indigo-500 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Members
                            </Link>
                            {session.role === 'admin' && (
                                <Link href="/admin/credentials" className="hover:bg-indigo-500 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    ศูนย์จัดการสมาชิกกิล
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ส่วน Profile, Dark Mode และปุ่ม Hamburger */}
                    <div className="flex items-center space-x-3 md:space-x-4">
                        <button
                            type="button"
                            onClick={toggleDarkMode}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-gray-700' : 'bg-indigo-400'
                                }`}
                            aria-label="Toggle Dark Mode"
                        >
                            <span className="sr-only">Toggle Dark Mode</span>
                            <span
                                className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-8' : 'translate-x-1'
                                    }`}
                            >
                                <span className="text-[10px] leading-none">{isDarkMode ? '🌙' : '☀️'}</span>
                            </span>
                        </button>

                        <span className="hidden md:block text-sm font-medium opacity-80">
                            {session.uid_game} ({session.role})
                        </span>

                        <form onSubmit={handleLogout} className="hidden md:block">
                            <button type="submit" className="bg-indigo-700 dark:bg-gray-800 dark:border dark:border-gray-700 hover:bg-indigo-800 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Logout
                            </button>
                        </form>

                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-md hover:bg-indigo-500 dark:hover:bg-gray-800 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* เมนู Dropdown แถวแนวตั้ง (Mobile) */}
            {isOpen && (
                <div className="md:hidden bg-indigo-700 dark:bg-gray-950 px-2 pt-2 pb-3 space-y-1 shadow-inner">
                    <Link href="/" className="block hover:bg-indigo-600 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium">
                        Dashboard
                    </Link>
                    <Link href="/profile" className="block hover:bg-indigo-600 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium">
                        My Profile
                    </Link>
                    <Link href="/members" className="block hover:bg-indigo-600 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium">
                        Members
                    </Link>
                    {session.role === 'admin' && (
                        <Link href="/admin/credentials" className="block hover:bg-indigo-600 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium">
                            ศูนย์จัดการสมาชิกกิล
                        </Link>
                    )}

                    <div className="border-t border-indigo-500 dark:border-gray-800 mt-4 pt-4 pb-1">
                        <div className="px-3 text-sm opacity-80 mb-2">
                            เข้าสู่ระบบในชื่อ: {session.uid_game} ({session.role})
                        </div>
                        <form onSubmit={handleLogout}>
                            <button type="submit" className="w-full text-left bg-red-600/80 hover:bg-red-600 px-3 py-2 rounded-md text-base font-medium transition-colors">
                                Logout
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </nav>
    )
}
