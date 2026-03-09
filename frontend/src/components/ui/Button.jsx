import { cn } from '@/utils/cn'
import Spinner from './Spinner'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  green:     'btn-green',
  ghost:     'btn-ghost',
  danger:    'bg-red-500 text-white font-bold px-6 py-3 rounded-2xl border-2 border-red-600 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 cursor-pointer',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: '',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className,
  ...props
}) {
  return (
    <button
      className={cn(variants[variant], sizes[size], className,
        (loading || disabled) && 'opacity-60 cursor-not-allowed pointer-events-none'
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
