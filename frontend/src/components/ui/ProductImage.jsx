import { useState } from 'react'
import { cn } from '@/utils/cn'

export default function ProductImage({ storageKey, alt, className }) {
  const [error, setError] = useState(false)
  const src = storageKey ? `/files/${storageKey}` : null

  if (!src || error) {
    return (
      <div className={cn(
        'bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center',
        className
      )}>
        <span className="text-4xl">🛍️</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={cn('object-cover', className)}
    />
  )
}
