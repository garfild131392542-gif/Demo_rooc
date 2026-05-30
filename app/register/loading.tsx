// app/register/loading.tsx
export default function RegisterLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        
        {/* Header Skeleton (Title & Subtitle) */}
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
        </div>

        {/* Form Skeleton */}
        <div className="mt-8 space-y-4">
          
          {/* วนลูปสร้าง Input Skeletons 5 ช่อง */}
          {[...Array(5)].map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-700/50 rounded-md animate-pulse" />
            </div>
          ))}

          {/* Submit Button */}
          <div className="pt-4">
            <div className="h-10 w-full bg-indigo-200 dark:bg-indigo-900/30 rounded-md animate-pulse" />
          </div>

          {/* Bottom Link */}
          <div className="flex justify-center mt-4">
            <div className="h-4 w-52 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
          </div>

        </div>
      </div>
    </div>
  )
}