import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Input = forwardRef(({ label, error, icon, className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label className="text-sm font-bold text-stone-700">{label}</label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'input',
          icon && 'pl-10',
          error && 'border-red-400 focus:border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input
