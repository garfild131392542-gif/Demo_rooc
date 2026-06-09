export default function MembersLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col items-center">

        {/* ไอคอนกำลังโหลด (Spinner) */}
        <svg
          className="h-12 w-12 animate-spin text-blue-600 mb-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        <h2 className="text-xl font-bold text-slate-800 mb-2">กำลังโหลดข้อมูลสมาชิก...</h2>
        <p className="text-sm text-slate-500 mb-8 animate-pulse">โปรดรอสักครู่ ระบบกำลังดึงข้อมูลจากฐานข้อมูล</p>

        {/* Skeleton Card (โครงร่างจำลองระหว่างรอโหลด) */}
        <div className="w-full space-y-4 bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="h-2 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}