export default function DashboardLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-8">

            {/* 1. Header Section */}
            <div className="space-y-2">
                <div className="h-9 w-72 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-5 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* 2. Main Party Grid (ด้านซ้าย) */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 order-2 lg:order-1 w-full">
                    {[...Array(6)].map((_, partyIndex) => (
                        <div key={partyIndex} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            {/* Header ของแต่ละตี้ */}
                            <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                            </div>

                            {/* Slots ภายในตี้ */}
                            <div className="p-4 space-y-3">
                                {[...Array(5)].map((_, slotIndex) => (
                                    <div
                                        key={slotIndex}
                                        className={`flex items-center space-x-3 p-2 rounded-xl border ${slotIndex < 2
                                                ? 'border-transparent bg-gray-50 dark:bg-gray-700/30' // จำลองช่องที่มีคน
                                                : 'border-dashed border-gray-200 dark:border-gray-700' // จำลองช่องว่าง Slot
                                            }`}
                                    >
                                        {/* วงกลมสีอาชีพ */}
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0 animate-pulse" />
                                        {/* ชื่อและอาชีพ */}
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                                            <div className="h-2 w-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 3. Sidebar (ด้านขวา) */}
                <div className="w-full lg:w-80 space-y-6 order-1 lg:order-2">
                    {/* รอจัดปาร์ตี้ */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="h-5 w-24 bg-indigo-200 dark:bg-indigo-800 rounded animate-pulse" />
                            <div className="h-6 w-6 bg-indigo-100 dark:bg-indigo-900 rounded-full animate-pulse" />
                        </div>
                        {/* Search Bar Placeholder */}
                        <div className="h-10 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
                        {/* รายชื่อคนใน Waitlist */}
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 animate-pulse" />
                        ))}
                    </div>

                    {/* ลากิจกรรม */}
                    <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl p-4 border border-rose-100/50 dark:border-rose-500/10">
                        <div className="h-5 w-24 bg-rose-200 dark:bg-rose-800 rounded animate-pulse" />
                        <div className="mt-4 h-32 w-full bg-white/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-rose-200 dark:border-rose-800/30 flex items-center justify-center">
                            <div className="h-3 w-32 bg-rose-100 dark:bg-rose-900/30 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}