'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                step <= currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
              }`}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={`w-8 h-1 ${
                  step < currentStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  )
}
