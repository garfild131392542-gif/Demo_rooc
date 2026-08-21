export default function TacticsLoading() {
  return (
    <div className="w-full mt-4 max-w-[1720px] mx-auto px-4 animate-pulse">
      <div
        className="relative w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex shadow-sm"
        style={{ height: '820px' }}
      >
        {/* ─── 👥 LEFT PANEL Skeleton: Parties Configuration ─── */}
        <div className="shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>

          {/* Activity Selector */}
          <div className="mt-3 shrink-0 space-y-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>

          {/* Scrollable Party Cards List Skeleton */}
          <div className="flex-grow overflow-hidden mt-4 pr-1 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-xs"
              >
                {/* Party Header & Name Input */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0"></div>
                    <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
                  </div>
                  <div className="h-5 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>

                {/* Party Member Slot Inputs */}
                <div className="space-y-1.5 pl-8">
                  {[...Array(5)].map((_, slotIdx) => (
                    <div key={slotIdx} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-3 bg-slate-200 dark:bg-slate-700 rounded-xs"></div>
                      <div className="h-6 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"></div>
                    </div>
                  ))}
                </div>

                {/* Mini notes */}
                <div className="pl-8 pt-0.5">
                  <div className="h-8 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 🛠️ CENTRAL AREA Skeleton: Blueprint Board Canvas ─── */}
        <div className="flex-1 h-full relative min-w-0 bg-slate-950 overflow-hidden flex flex-col justify-between">
          {/* Floating Right panel controls skeleton */}
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
            <div className="h-8 w-36 bg-indigo-600/40 rounded-xl border border-indigo-500/20"></div>
            <div className="h-8 w-32 bg-slate-800/80 rounded-xl border border-slate-700/60"></div>
          </div>

          {/* Floating Toolbar Skeleton */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-full shadow-lg">
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-7 h-7 bg-slate-800 rounded-full"></div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-slate-800 rounded-full"></div>
              ))}
            </div>
            <div className="w-7 h-7 bg-slate-800 rounded-full"></div>
          </div>

          {/* Blueprint Canvas Graphic Skeleton */}
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[#080d1a] opacity-80">
              <svg className="w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="loadingGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#loadingGridPattern)" />
              </svg>
            </div>

            {/* Simulated Tokens Placeholder on Board */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-12 p-8 max-w-2xl opacity-40">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                  </div>
                  <div className="h-3 w-14 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── ⚙️ RIGHT PANEL Skeleton: Tactical Config & Settings ─── */}
        <div className="shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>

          {/* Settings Content Skeleton */}
          <div className="flex-grow overflow-hidden mt-4 pr-1 space-y-4">
            {/* Battle notes */}
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
            </div>

            {/* Map selection */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
              <div className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
            </div>

            {/* Admin Reset buttons */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
                <div className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
              </div>
            </div>

            {/* Download/Export Button */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-9 bg-indigo-600/40 rounded-xl border border-indigo-500/20"></div>
            </div>

            {/* Media Recording Section */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
