export default function Loading() {
  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Skeleton */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          
          {/* Status Form Card Skeleton */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
          </div>

          {/* Character Info Card Skeleton */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="space-y-3">
              <div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-1"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
              </div>
              <div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-1"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
              </div>
              <div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-1"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Queue Card Skeleton */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl w-full animate-pulse"></div>
          </div>

        </div>

        {/* Main Stats Form Skeleton */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
            
            {/* Header section */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
                </div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-32"></div>
              </div>
            </div>

            {/* Inputs grid */}
            <div className="p-6 xl:p-8 flex-1 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer action button */}
            <div className="p-6 xl:px-8 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}