export default function ProfileLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto p-6">
            <div className="flex flex-col items-center space-y-8">

                {/* หัวข้อ My Profile */}
                <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

                {/* การ์ดแบบฟอร์ม (จำลองขนาดจากหน้าจริง) */}
                <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">

                    {/* แถวที่ 1: UID */}
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                    </div>

                    {/* แถวที่ 2: Display Name */}
                    <div className="space-y-2">
                        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                    </div>

                    {/* แถวที่ 3: Job Name */}
                    <div className="space-y-2">
                        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                    </div>

                    {/* แถวที่ 4: PvP Stats (แบ่ง 2 คอลัมน์) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-12 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                        </div>
                    </div>

                    {/* แถวสุดท้าย: ปุ่มบันทึก */}
                    <div className="pt-4">
                        <div className="h-12 w-full bg-indigo-200 dark:bg-indigo-900/30 rounded-lg animate-pulse" />
                    </div>

                </div>
            </div>
        </div>
    )
}