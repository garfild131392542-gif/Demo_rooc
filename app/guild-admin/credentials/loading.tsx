export default function AdminCredentialsLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">

            {/* ส่วนหัวข้อหน้า */}
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-8" />

            {/* แถบเครื่องมือจัดการ (Filter, Search, Add Button) */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />

                <div className="flex flex-wrap items-center gap-3">
                    {/* Checkbox Filter */}
                    <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                    {/* Search Input */}
                    <div className="h-10 w-64 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                    {/* Add Member Button */}
                    <div className="h-10 w-32 bg-indigo-200 dark:bg-indigo-900/30 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* ตารางจัดการสมาชิก (Table Skeleton) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
                <div className="min-w-[1200px]">
                    {/* หัวตาราง */}
                    <div className="grid grid-cols-10 bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700 text-xs uppercase">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        ))}
                    </div>

                    {/* แถวข้อมูล (จำลอง 8 แถว) */}
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="grid grid-cols-10 p-4 items-center gap-2">
                                <div className="h-4 w-12 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" /> {/* UID */}
                                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> {/* Name */}
                                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /> {/* Job */}
                                <div className="h-5 w-16 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" /> {/* Role */}
                                <div className="h-4 w-12 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" /> {/* PvP R */}
                                <div className="h-4 w-12 bg-rose-100 dark:bg-rose-900/20 rounded animate-pulse" /> {/* PvP D */}
                                <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" /> {/* Password */}
                                <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /> {/* Toggle */}
                                <div className="h-8 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /> {/* Last Update */}

                                {/* Actions Buttons Group */}
                                <div className="flex space-x-1">
                                    <div className="h-8 w-12 bg-indigo-100 dark:bg-indigo-900/20 rounded animate-pulse" />
                                    <div className="h-8 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="h-8 w-16 bg-red-100 dark:bg-red-900/20 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}