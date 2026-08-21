export default function AuctionLoading() {
  return (
    <div className="p-4 sm:p-8 min-h-screen animate-pulse">
      <div className="w-full max-w-475 mx-auto grid grid-cols-1 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(320px,360px)] gap-6 items-start">
        
        {/* ─── 📦 LEFT PANEL Skeleton: Limits per person ─── */}
        <div className="w-full flex flex-col gap-3 sticky top-15">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md">
            {/* Title */}
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded-md mb-4"></div>
            
            {/* 4 Items Limit Grid */}
            <div className="grid grid-cols-4 gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
                >
                  <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3"></div>
                  <div className="w-full h-10 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── ⚖️ CENTER PANEL Skeleton: Auction Window ─── */}
        <div className="w-full min-w-0">
          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-3xl p-2.5 shadow-xl relative overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex flex-col">
            
            {/* Window Top Header Bar */}
            <div className="flex justify-between items-center px-4 py-3 bg-blue-600/90 dark:bg-blue-900/90 rounded-t-[18px] border-b border-blue-700 dark:border-slate-700 shadow-sm gap-4 flex-wrap">
              {/* Title & Icon */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/30 rounded-full"></div>
                <div className="h-5 w-52 bg-white/40 rounded-md"></div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-7 w-24 bg-white/20 rounded-full"></div>
                ))}
              </div>

              {/* Refresh Button */}
              <div className="h-7 w-20 bg-white/20 rounded-full ml-auto"></div>
            </div>

            {/* Inner Content Area */}
            <div className="flex flex-col flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 border-t-0 rounded-b-2xl p-4 md:p-6 shadow-inner mt-2.5 mx-2.5 mb-2.5">
              
              {/* Sub-tabs Filter Bar */}
              <div className="flex justify-center mb-6">
                <div className="flex flex-wrap justify-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  ))}
                </div>
              </div>

              {/* Slot Rows List (4 slots) */}
              <div className="flex-1 flex flex-col gap-4 overflow-hidden pr-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    {/* Left: Item Icon & Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0"></div>
                      <div className="flex flex-col gap-2 min-w-0 flex-1">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-5 w-44 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                        <div className="h-4 w-32 bg-slate-100 dark:bg-slate-700/60 rounded"></div>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex items-center gap-4 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-700/50 justify-end shrink-0">
                      <div className="h-7 w-20 bg-slate-100 dark:bg-slate-700/60 rounded-full"></div>
                      <div className="h-10 w-40 bg-slate-100 dark:bg-slate-700/60 rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl">
                  <div className="h-7 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-7 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-7 w-12 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-7 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-7 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ─── 📝 RIGHT PANEL Skeleton: Admin Calculation & Form ─── */}
        <div className="w-full flex flex-col gap-4 sticky top-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
            {/* Top Action Button */}
            <div className="mb-4">
              <div className="w-full h-11 bg-green-600/40 rounded-lg"></div>
            </div>

            {/* Live Total Summary */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2"></div>
                    <div className="w-full h-8 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="flex-1 flex flex-col">
              <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
              <div className="space-y-2.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-center">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-full h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"></div>
                      <div className="w-full h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"></div>
                      <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0"></div>
                      <div className="w-full h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"></div>
                      <div className="w-full h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
