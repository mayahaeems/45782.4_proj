import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/utils/format'
import { useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart'
import { useAuthStore } from '@/store/authStore'
import ProductImage from '@/components/ui/ProductImage'

export default function CartItem({ item }) {
  const { mutate: update, isPending: updating } = useUpdateCartItem()
  const { mutate: remove, isPending: removing } = useRemoveCartItem()
  const isLoggedIn = useAuthStore((s) => !!s.token)

  // For guest items: item.product_id exists, item.id might be undefined
  // For server items: item.id is the cart item id
  const productId = item.product_id ?? item.product?.id
  const itemId = isLoggedIn ? item.id : undefined

  const handleDecrease = () => {
    if (item.quantity > 1) {
      update({ itemId, productId, quantity: item.quantity - 1 })
    } else {
      remove({ itemId, productId })
    }
  }

  const handleIncrease = () => {
    update({ itemId, productId, quantity: item.quantity + 1 })
  }

  const handleRemove = () => {
    remove({ itemId, productId })
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-stone-100">
      {/* image */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50">
        <ProductImage
          storageKey={item.product?.main_image?.storage_key}
          alt={item.product?.name}
          className="w-full h-full"
        />
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-stone-800 text-sm line-clamp-1">{item.product?.name}</p>
        <p className="text-brand-600 font-display text-sm">{formatPrice(item.product?.price_amount)}</p>
      </div>

      {/* qty controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrease}
          disabled={updating || removing}
          className="w-8 h-8 rounded-xl border-2 border-stone-200 flex items-center justify-center
                     hover:border-brand-400 hover:text-brand-500 transition-colors
                     disabled:opacity-50"
        >
          <Minus size={14} />
        </button>

        <span className="w-8 text-center font-bold text-stone-800">{item.quantity}</span>

        <button
          onClick={handleIncrease}
          disabled={updating || (item.product?.quantity != null && item.quantity >= item.product.quantity)}
          className="w-8 h-8 rounded-xl bg-brand-500 text-white border-2 border-brand-600
                     flex items-center justify-center
                     hover:-translate-y-0.5 transition-all
                     disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* subtotal */}
      <div className="text-right min-w-[60px]">
        <p className="font-bold text-stone-800 text-sm">
          {formatPrice((item.product?.price_amount ?? 0) * item.quantity)}
        </p>
      </div>

      {/* remove */}
      <button
        onClick={handleRemove}
        disabled={removing}
        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50
                   rounded-xl transition-colors disabled:opacity-50"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}