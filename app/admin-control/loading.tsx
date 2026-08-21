export default function AdminControlLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ─── 🛡️ Header Section Skeleton ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl border border-blue-500/20">
              <div className="w-8 h-8 bg-blue-400/40 rounded-lg"></div>
            </div>
            <div className="space-y-2">
              <div className="h-8 w-80 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-slate-700/60 rounded"></div>
            </div>
          </div>

          {/* Navigation Tabs Skeleton */}
          <div className="flex bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 p-1.5 rounded-2xl gap-1 self-start lg:self-auto">
            <div className="h-10 w-44 bg-blue-600/40 rounded-xl"></div>
            <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
          </div>
        </div>

        {/* ─── 🏢 Guilds Table Card Skeleton ─── */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
          {/* Header & Search / Filter Controls */}
          <div className="p-6 border-b border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1.5">
                <div className="h-6 w-64 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                <div className="h-3 w-80 max-w-full bg-slate-200 dark:bg-slate-700/60 rounded"></div>
              </div>
              <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto"></div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
              {/* Search Box */}
              <div className="h-10 w-full max-w-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl"></div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <div className="h-8 w-24 bg-blue-600/40 rounded-xl"></div>
                <div className="h-8 w-32 bg-purple-100 dark:bg-purple-950/40 rounded-xl border border-purple-200/50 dark:border-purple-800/50"></div>
                <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-8 w-24 bg-red-100 dark:bg-red-950/40 rounded-xl border border-red-200/50 dark:border-red-800/50"></div>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-white/10">
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="px-6 py-4 text-center"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="px-6 py-4"><div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div></th>
                  <th className="px-6 py-4 text-center"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded mx-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="hover:bg-slate-100/30 dark:hover:bg-white/5">
                    {/* Guild Info */}
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </td>
                    {/* Guild Master */}
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </td>
                    {/* Member Count */}
                    <td className="px-6 py-4 text-center">
                      <div className="h-4 w-12 bg-blue-100 dark:bg-blue-900/30 rounded mx-auto"></div>
                    </td>
                    {/* Plan Type Badge */}
                    <td className="px-6 py-4">
                      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700/60 rounded-full"></div>
                    </td>
                    {/* Expiry Date */}
                    <td className="px-6 py-4 space-y-1.5">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </td>
                    {/* Action Button */}
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 w-24 bg-blue-600/40 rounded-xl mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/2">
            <div className="h-4 w-52 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-8 w-24 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
