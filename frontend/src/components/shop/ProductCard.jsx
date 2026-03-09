import { ShoppingCart, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import { useAddToCart } from '@/hooks/useCart'
import ProductImage from '@/components/ui/ProductImage'
import Badge from '@/components/ui/Badge'

export default function ProductCard({ product }) {
  const { mutate: addToCart, isPending } = useAddToCart()

  const handleAdd = (e) => {
    e.preventDefault()
    // Works for both guests (adds to local cart) and logged-in users (adds to server cart)
    addToCart({ product, quantity: 1 })
  }

  const outOfStock = product.quantity === 0 || product.is_active === false

  return (
    <Link to={`/products/${product.id}`} className="block group">
      <div className="card overflow-hidden hover:border-brand-300">
        {/* image */}
        <div className="relative aspect-square overflow-hidden rounded-t-3xl bg-stone-50">
          <ProductImage
            storageKey={product.main_image?.storage_key}
            alt={product.name}
            className="w-full h-full transition-transform duration-300 group-hover:scale-105"
          />
          {outOfStock && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Badge variant="red">Out of Stock</Badge>
            </div>
          )}
          {product.quantity <= 5 && product.quantity > 0 && product.is_active !== false && (
            <div className="absolute top-2 right-2">
              <Badge variant="yellow">Only {product.quantity} left!</Badge>
            </div>
          )}
        </div>

        {/* info */}
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-body font-bold text-stone-800 text-sm leading-tight line-clamp-2">
            {product.name}
          </h3>

          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-lg font-display text-brand-600">
              {formatPrice(product.price_amount)}
            </span>

            <button
              onClick={handleAdd}
              disabled={outOfStock || isPending}
              className="w-9 h-9 bg-brand-500 text-white rounded-xl flex items-center justify-center
                         border-2 border-brand-600 shadow-fun-brand
                         hover:-translate-y-0.5 active:translate-y-0.5
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-150"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={16} strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}