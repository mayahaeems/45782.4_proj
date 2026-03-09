import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight, LogIn } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import CartItem from '@/components/shop/CartItem'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

export default function CartPage() {
  const { data: cart, isLoading, isGuest } = useCart()
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const navigate = useNavigate()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const items = cart?.items ?? []
  const total = items.reduce((sum, i) => sum + (i.product?.price_amount ?? 0) * i.quantity, 0)

  const handleCheckout = () => {
    if (!isLoggedIn) {
      // Remember that after login+merge, we want to go to /checkout
      sessionStorage.setItem('pendingCheckout', '/checkout')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  if (items.length === 0) return (
    <EmptyState
      emoji="🛒"
      title="Your cart is empty"
      message="Add some delicious items from the shop!"
      action={<Link to="/" className="btn-primary">Browse Products</Link>}
    />
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <ShoppingBag className="text-brand-500" size={28} />
        <h1 className="section-title">Your Cart</h1>
        <span className="bg-brand-100 text-brand-700 font-bold px-3 py-1 rounded-full text-sm">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        {isGuest && (
          <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
            👤 Guest cart ·{' '}
            <Link to="/login" className="underline font-bold">Login to save</Link>
          </span>
        )}
      </div>

      {/* Guest notice banner */}
      {isGuest && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">🔐</span>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">You're shopping as a guest</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Your cart is saved locally. Log in to keep it across devices and place orders.
            </p>
          </div>
          <Link to="/login" className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold
                                       text-white bg-amber-500 hover:bg-amber-600 px-3 py-2 rounded-xl
                                       transition-colors">
            <LogIn size={13} /> Login
          </Link>
        </div>
      )}

      {/* Items */}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItem key={item.product_id ?? item.id} item={item} />
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-body text-stone-600">Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
          <span className="font-display text-xl text-stone-800">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="font-body text-stone-600">Delivery</span>
          <span className="text-fresh-600 font-bold">FREE 🎉</span>
        </div>
        <div className="flex justify-between items-center border-t-2 border-stone-100 pt-4 mb-6">
          <span className="font-display text-lg text-stone-800">Total</span>
          <span className="font-display text-2xl text-brand-600">{formatPrice(total)}</span>
        </div>

        <Button
          onClick={handleCheckout}
          className="w-full flex items-center justify-center gap-2"
          size="lg"
        >
          {isLoggedIn ? 'Proceed to Checkout' : '🔐 Login to Checkout'}
          <ArrowRight size={18} />
        </Button>

        {!isLoggedIn && (
          <p className="text-center text-stone-400 text-xs mt-3">
            Don't have an account?{' '}
            <Link
              to="/register"
              onClick={() => sessionStorage.setItem('pendingCheckout', '/checkout')}
              className="text-brand-600 font-bold hover:underline"
            >
              Sign up free
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
