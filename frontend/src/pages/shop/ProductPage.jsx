import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useProduct } from '@/hooks/useProducts'
import { useAddToCart } from '@/hooks/useCart'
import { formatPrice } from '@/utils/format'
import ProductImage from '@/components/ui/ProductImage'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function ProductPage() {
  const { id } = useParams()
  const { data: product, isLoading } = useProduct(id)
  const { mutate: addToCart, isPending } = useAddToCart()
  const [qty, setQty] = useState(1)

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )
  if (!product) return (
    <div className="text-center py-20">
      <p className="text-stone-500">Product not found</p>
    </div>
  )

  const outOfStock = product.quantity === 0 || product.is_active === false

  // Works for guests (local cart) and logged-in users (server cart)
  const handleAdd = () => {
    addToCart({ product, quantity: qty })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="btn-ghost flex items-center gap-2 w-fit mb-6">
        <ArrowLeft size={16} /> Back to shop
      </Link>

      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="aspect-square bg-stone-50">
            <ProductImage
              storageKey={product.main_image?.storage_key}
              alt={product.name}
              className="w-full h-full"
            />
          </div>

          {/* Details */}
          <div className="p-8 flex flex-col gap-4">
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {product.categories?.map((cat) => (
                <Badge key={cat.id} variant="orange">{cat.name}</Badge>
              ))}
            </div>

            <h1 className="text-3xl font-display text-stone-800">{product.name}</h1>

            {product.description && (
              <p className="text-stone-500 font-body leading-relaxed">{product.description}</p>
            )}

            <div className="text-4xl font-display text-brand-600 mt-2">
              {formatPrice(product.price_amount)}
            </div>

            {/* Stock */}
            {outOfStock ? (
              <Badge variant="red" className="w-fit text-sm">Out of Stock</Badge>
            ) : (
              <p className="text-fresh-600 font-semibold text-sm">
                ✅ {product.quantity} in stock
              </p>
            )}

            {/* Qty selector + Add to Cart */}
            {!outOfStock && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-3 bg-stone-50 rounded-2xl p-1 border-2 border-stone-200">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center
                               hover:bg-white hover:shadow-fun transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.quantity, qty + 1))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center
                               hover:bg-white hover:shadow-fun transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <Button
                  onClick={handleAdd}
                  loading={isPending}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Add to Cart
                </Button>
              </div>
            )}

            {/* All images */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer
                      ${img.id === product.main_image_id ? 'border-brand-400' : 'border-stone-200'}`}
                  >
                    <ProductImage storageKey={img.storage_key} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}