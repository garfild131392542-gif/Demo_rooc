'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
  const stepLabels = ['ข้อมูลกิลด์', 'ข้อมูลติดต่อ', 'ยืนยันและสร้าง']

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {steps.map((step) => {
          const isDone = step < currentStep
          const isActive = step === currentStep
          return (
            <div key={step} className="flex items-center gap-2 sm:gap-3">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 ${
                  isActive
                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20 scale-105'
                    : isDone
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white/40 dark:bg-slate-800/50 text-slate-400 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md'
                }`}
              >
                {isDone ? '✓' : step}
              </div>
              {step < totalSteps && (
                <div
                  className={`w-8 sm:w-14 h-1 rounded-full transition-all duration-500 ${
                    isDone
                      ? 'bg-linear-to-r from-emerald-500 to-blue-600'
                      : 'bg-slate-200/80 dark:bg-slate-700/60'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="text-center">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/60 backdrop-blur-xs">
          ขั้นตอนที่ {currentStep} จาก {totalSteps}: {stepLabels[currentStep - 1] || ''}
        </span>
      </div>
    </div>
  )
}
