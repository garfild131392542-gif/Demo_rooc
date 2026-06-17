export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-2xl p-8 animate-pulse space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
        </div>

        {/* Mode subtitle */}
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>

        {/* Form Fields Skeletons */}
        <div className="space-y-5">
          {/* Field 1: Guild Name */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          </div>

          {/* Field 2: Description */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-24 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          </div>

          {/* Field 3: Discord Link */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          </div>

          {/* Field 4: Logo Upload */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="flex gap-4 items-center">
              <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex-1"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-24"></div>
            </div>
          </div>

          {/* Field 5: Color picker */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="flex gap-3">
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-16"></div>
              <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl flex-1"></div>
            </div>
          </div>

          {/* Field 6: Webhook */}
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-xl"></div>
          </div>
        </div>

        {/* Save button */}
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl w-full pt-2"></div>

      </div>
    </div>
  )
}