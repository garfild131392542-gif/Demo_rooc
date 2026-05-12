// 💡 ต้องมีคำว่า "export default" นำหน้าเสมอ
export default function MembersLoading() {
    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-6">

            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                <div className="flex items-center space-x-2">
                    <div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ))}
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="grid grid-cols-5 p-4 items-center">
                            <div className="h-4 w-8 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
                            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="h-6 w-24 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-4 w-16 bg-emerald-100 dark:bg-emerald-900/20 rounded animate-pulse" />
                            <div className="h-4 w-16 bg-rose-100 dark:bg-rose-900/20 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}