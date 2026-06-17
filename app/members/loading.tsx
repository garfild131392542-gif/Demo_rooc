export default function MembersLoading() {
  return (
    <div className="max-w-[1800px] mx-auto px-4 py-8 animate-pulse">
      {/* Header Skeleton */}
      <header className="mb-6 space-y-2">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-96"></div>
      </header>

      {/* Filters bar Skeleton */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 w-24 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          ))}
        </div>
        <div className="h-10 w-64 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Table Header */}
            <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] bg-slate-50 dark:bg-slate-900/50 p-5 border-b border-slate-200 dark:border-slate-700/60">
              <div className="col-span-2 h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              <div className="col-span-1 h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              {[...Array(11)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mx-auto"></div>
              ))}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {[...Array(10)].map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-[repeat(14,minmax(0,1fr))] p-5 items-center">
                  {/* Name column */}
                  <div className="col-span-2 flex items-center space-x-3">
                    <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                  </div>
                  {/* Job Column */}
                  <div className="col-span-1 h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                  {/* Stats columns */}
                  {[...Array(11)].map((_, colIndex) => (
                    <div key={colIndex} className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-12 mx-auto"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}