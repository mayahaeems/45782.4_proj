import { cn } from '@/utils/cn'

const EMOJI = {
  'Dairy':               '🥛',
  'Meat & Poultry':      '🍗',
  'Fruits & Vegetables': '🥦',
  'Bakery':              '🍞',
  'Beverages':           '🧃',
  'Pantry':              '🥫',
  'Snacks':              '🍿',
  'Frozen':              '🧊',
}

export default function CategoryPill({ category, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-bold text-sm',
        'transition-all duration-150 whitespace-nowrap',
        active
          ? 'bg-brand-500 text-white border-brand-600 shadow-fun-brand -translate-y-0.5'
          : 'bg-white text-stone-600 border-stone-200 shadow-fun hover:-translate-y-0.5'
      )}
    >
      <span>{EMOJI[category.name] ?? '🏷️'}</span>
      {category.name}
    </button>
  )
}
