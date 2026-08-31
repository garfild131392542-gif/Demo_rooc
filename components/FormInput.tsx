'use client'

interface FormInputProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  required?: boolean
  disabled?: boolean
  onBlur?: () => void
}

export function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  onBlur,
}: FormInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        className={`w-full px-4 py-3 rounded-2xl border ${
          error
            ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 focus:ring-rose-500/20 focus:border-rose-500'
            : 'border-slate-200/80 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15'
        } backdrop-blur-md transition-all text-sm font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  )
}
