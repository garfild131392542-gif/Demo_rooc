export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* ส่วนหัว */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
          </div>
        </div>
        <div className="h-10 w-28 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
      </div>

      {/* บล็อกสถิติ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-5 shadow-sm space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mx-auto"></div>
          </div>
        ))}
      </div>

      {/* บล็อกกรอง และค้นหา */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="h-10 w-72 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        </div>

        {/* ตาราง Skeleton */}
        <div className="hidden md:block border border-slate-200/60 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900/40 h-12 border-b border-slate-200 dark:border-slate-700"></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 flex items-center px-6 justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
