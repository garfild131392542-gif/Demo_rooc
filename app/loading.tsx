export default function Loading() {
  return (
    <div className="w-full mt-10 max-w-[1450px] mx-auto px-4 animate-pulse">
      {/* ส่วน Header Skeleton */}
      <header className="mb-8 mx-10">
        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
        <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </header>

      {/* ส่วน Dashboard Skeleton (จำลองเค้าโครงของตาราง/การจัดปาร์ตี้) */}
      <div className="mx-10 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* คอลัมน์ซ้าย: จำลองรายชื่อสมาชิกที่รอโดนลาก (Member List) */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 h-[600px]">
          <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        </div>

        {/* คอลัมน์ขวา: จำลองกล่องปาร์ตี้ (Party Slots) */}
        <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6 border border-gray-100 dark:border-gray-700 h-[600px]">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-10 w-full bg-gray-50 dark:bg-gray-700/30 rounded"></div>
                  <div className="h-10 w-full bg-gray-50 dark:bg-gray-700/30 rounded"></div>
                  <div className="h-10 w-full bg-gray-50 dark:bg-gray-700/30 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}