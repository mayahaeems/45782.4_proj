import { cn } from '@/utils/cn'

const variants = {
  orange:  'bg-brand-100 text-brand-700 border-brand-300',
  green:   'bg-fresh-100 text-fresh-700 border-fresh-300',
  blue:    'bg-ocean-100 text-ocean-700 border-ocean-300',
  purple:  'bg-berry-100 text-berry-700 border-berry-300',
  yellow:  'bg-sunny-100 text-sunny-700 border-sunny-300',
  red:     'bg-red-100 text-red-700 border-red-300',
  gray:    'bg-stone-100 text-stone-600 border-stone-300',
}

export default function Badge({ variant = 'gray', children, className }) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

// Map order/delivery statuses to badge colors
export const statusVariant = (status) => ({
  pending:    'yellow',
  processing: 'blue',
  assigned:   'purple',
  on_the_way: 'orange',
  delivered:  'green',
  canceled:   'red',
  paid:       'green',
  refunded:   'blue',
  failed:     'red',
}[status] ?? 'gray')
