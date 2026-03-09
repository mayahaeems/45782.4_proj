import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, LogOut, Package, LayoutDashboard, ChevronDown, X, ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useLogout } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/utils/format'
import ProductImage from '@/components/ui/ProductImage'

/* ── Mini cart popup ─────────────────────────────────────────────────── */
function CartPreview({ onClose }) {
  const { token } = useAuthStore()
  const guestItems = useCartStore((s) => s.guestItems)

  // Always fetch fresh from server when logged in
  const { data: serverCart, isFetching } = useCart()

  // When logged in: use DB cart. When guest: use local.
  const items = token
    ? (serverCart?.items ?? [])
    : guestItems

  const rows = token
    ? items.map((i) => ({ product: i.product, quantity: i.quantity, id: i.id ?? i.product_id }))
    : items.map((i) => ({ product: i.product, quantity: i.quantity, id: i.product_id }))

  // price_amount from product object, or unit_amount snapshot from cart item
  const getPrice = (row) => row.product?.price_amount ?? row.unit_amount ?? 0

  const total = rows.reduce((sum, r) => sum + getPrice(r) * r.quantity, 0)

  // Show loading spinner while DB cart is being fetched/refreshed
  if (token && isFetching && rows.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl border-2
                      border-stone-200 shadow-fun overflow-hidden z-50 animate-slide-down">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
          <span className="font-display text-lg text-stone-800">My Cart 🛒</span>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl border-2
                    border-stone-200 shadow-fun overflow-hidden z-50 animate-slide-down">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50">
        <span className="font-display text-lg text-stone-800">My Cart 🛒</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Items */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-stone-400 gap-2">
          <ShoppingCart size={36} strokeWidth={1.5} />
          <p className="text-sm font-semibold">Your cart is empty</p>
        </div>
      ) : (
        <>
          <ul className="max-h-64 overflow-y-auto divide-y divide-stone-100">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                {/* image */}
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-stone-50 flex-shrink-0 border border-stone-100">
                  <ProductImage
                    storageKey={row.product?.main_image?.storage_key}
                    alt={row.product?.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800 truncate">
                    {row.product?.name}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {row.quantity} × {formatPrice(getPrice(row))}
                  </p>
                </div>

                {/* line total */}
                <span className="text-sm font-bold text-brand-600 flex-shrink-0">
                  {formatPrice(getPrice(row) * row.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="border-t border-stone-100 px-4 py-3 bg-stone-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-stone-500 font-semibold">Total</span>
              <span className="font-display text-xl text-brand-600">{formatPrice(total)}</span>
            </div>
            <Link
              to="/cart"
              onClick={onClose}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
            >
              Go to Cart
              <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Navbar ──────────────────────────────────────────────────────────── */
export default function Navbar() {
  const { user, token } = useAuthStore()
  const itemCount = useCartStore((s) => s.itemCount)
  const logout = useLogout()

  const [menuOpen, setMenuOpen]       = useState(false)
  const [cartOpen, setCartOpen]       = useState(false)
  const menuRef = useRef(null)
  const cartRef = useRef(null)
  const cartTimerRef = useRef(null)

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close cart popup on outside click
  useEffect(() => {
    const handler = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) setCartOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isShopUser = true

  /* hover handlers with small delay so popup doesn't flicker */
  const handleCartEnter = () => {
    clearTimeout(cartTimerRef.current)
    setCartOpen(true)
  }
  const handleCartLeave = () => {
    cartTimerRef.current = setTimeout(() => setCartOpen(false), 200)
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-stone-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
          <span className="text-2xl group-hover:animate-wiggle inline-block">🛒</span>
          <span className="font-display text-2xl text-brand-600">SuperMart</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">

          {user?.role === 'admin' && (
            <NavLink to="/admin" className="btn-ghost flex items-center gap-1.5 text-sm">
              <LayoutDashboard size={16} />
              <span className="hidden sm:inline">Admin</span>
            </NavLink>
          )}

          {user?.role === 'delivery' && (
            <NavLink to="/delivery" className="btn-ghost flex items-center gap-1.5 text-sm">
              <Package size={16} />
              <span className="hidden sm:inline">Deliveries</span>
            </NavLink>
          )}

          {token && user?.role === 'user' && (
            <NavLink to="/orders" className="btn-ghost flex items-center gap-1.5 text-sm">
              <Package size={16} />
              <span className="hidden sm:inline">Orders</span>
            </NavLink>
          )}

          {/* Cart with hover preview */}
          {isShopUser && (
            <div
              className="relative"
              ref={cartRef}
              onMouseEnter={handleCartEnter}
              onMouseLeave={handleCartLeave}
            >
              <Link to="/cart" className="relative p-2 group block">
                <ShoppingCart
                  size={22}
                  className="text-stone-600 group-hover:text-brand-500 transition-colors"
                />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-500 text-white
                                   text-xs font-bold rounded-full flex items-center justify-center
                                   border-2 border-white animate-bounce-in">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>

              {cartOpen && (
                <CartPreview onClose={() => setCartOpen(false)} />
              )}
            </div>
          )}

          {/* Auth section */}
          {token ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-2xl
                           hover:bg-stone-100 transition-colors text-sm font-semibold text-stone-700"
              >
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center
                                text-brand-700 font-bold text-sm flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user?.full_name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border-2
                                border-stone-200 shadow-fun overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                    <p className="font-bold text-stone-800 text-sm truncate">{user?.full_name}</p>
                    <p className="text-xs text-stone-400 truncate">{user?.email}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${user?.role === 'admin' ? 'bg-red-100 text-red-600'
                        : user?.role === 'delivery' ? 'bg-ocean-100 text-ocean-600'
                        : 'bg-fresh-100 text-fresh-600'
                      }`}>
                      {user?.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700
                                 hover:bg-stone-50 transition-colors"
                    >
                      <User size={15} className="text-stone-400" />
                      My Profile
                    </Link>

                    {user?.role === 'user' && (
                      <Link
                        to="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700
                                   hover:bg-stone-50 transition-colors"
                      >
                        <Package size={15} className="text-stone-400" />
                        My Orders
                      </Link>
                    )}

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700
                                   hover:bg-stone-50 transition-colors"
                      >
                        <LayoutDashboard size={15} className="text-stone-400" />
                        Admin Panel
                      </Link>
                    )}
                    {user?.role === 'delivery' && (
                      <Link
                        to="/delivery"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700
                                   hover:bg-stone-50 transition-colors"
                      >
                        <Package size={15} className="text-stone-400" />
                        Delivery Hub
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-stone-100 py-1">
                    <button
                      onClick={() => { setMenuOpen(false); logout() }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500
                                 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm">Login</Link>
              <Link to="/register" className="btn-primary text-sm px-4 py-2">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
