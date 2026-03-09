import { cn } from '@/utils/cn'

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn(
      'border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin',
      sizes[size], className
    )} />
  )
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="flex flex-col items-center gap-4">
        <span className="text-5xl animate-bounce">🛒</span>
        <Spinner size="lg" />
        <p className="font-body font-semibold text-stone-500">Loading...</p>
      </div>
    </div>
  )
}
