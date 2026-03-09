import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* panel */}
      <div
        className={cn(
          'relative w-full bg-white rounded-3xl border-2 border-stone-200',
          'shadow-[8px_8px_0px_0px_rgba(0,0,0,0.12)] animate-bounce-in',
          'max-h-[90vh] flex flex-col',
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
>
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-stone-100">
          <h2 className="text-2xl font-display text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 transition-colors text-stone-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
