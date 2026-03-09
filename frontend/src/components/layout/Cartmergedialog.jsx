import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Check, Trash2, ArrowRight, Package } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cartApi } from '@/api/cart'
import { useQueryClient } from '@tanstack/react-query'
import { formatPrice } from '@/utils/format'
import ProductImage from '@/components/ui/ProductImage'
import toast from 'react-hot-toast'

// ── Mini cart column ──────────────────────────────────────────────────────────
function CartColumn({ title, badge, badgeColor, items, total, selected, onSelect, accentClass, borderClass }) {
  return (
    <div
      onClick={onSelect}
      className={`flex-1 flex flex-col rounded-3xl border-2 cursor-pointer transition-all duration-200
        ${selected ? borderClass + ' shadow-fun scale-[1.01]' : 'border-stone-200 hover:border-stone-300'}
      `}
    >
      {/* Header */}
      <div className={`px-5 py-4 rounded-t-3xl flex items-center justify-between
        ${selected ? accentClass : 'bg-stone-50'}`}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className={selected ? 'text-white' : 'text-stone-500'} />
          <span className={`font-display text-lg ${selected ? 'text-white' : 'text-stone-700'}`}>
            {title}
          </span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full
          ${selected ? 'bg-white/30 text-white' : badgeColor}`}>
          {badge}
        </span>
      </div>

      {/* Items list */}
      <div className="flex-1 divide-y divide-stone-100 overflow-y-auto max-h-72">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-stone-300 gap-2">
            <Package size={32} strokeWidth={1.5} />
            <p className="text-sm">Empty cart</p>
          </div>
        ) : items.map((item, idx) => {
          const product = item.product
          const price = product?.price_amount ?? item.unit_amount ?? 0
          return (
            <div key={item.product_id ?? item.id ?? idx}
              className="flex items-center gap-3 px-4 py-3">
              {/* Image */}
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-50 flex-shrink-0 border border-stone-100">
                <ProductImage
                  storageKey={product?.main_image?.storage_key}
                  alt={product?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-800 truncate">
                  {product?.name ?? `Product #${item.product_id}`}
                </p>
                <p className="text-xs text-stone-400">
                  {item.quantity} × {formatPrice(price)}
                </p>
              </div>
              {/* Line total */}
              <span className="text-sm font-bold text-stone-700 flex-shrink-0">
                {formatPrice(price * item.quantity)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer total */}
      <div className={`px-5 py-4 rounded-b-3xl border-t-2 flex items-center justify-between
        ${selected ? accentClass + ' border-white/20' : 'bg-stone-50 border-stone-100'}`}>
        <span className={`text-sm font-semibold ${selected ? 'text-white/80' : 'text-stone-500'}`}>
          Total · {items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
        <span className={`font-display text-xl ${selected ? 'text-white' : 'text-stone-800'}`}>
          {formatPrice(total)}
        </span>
      </div>
    </div>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function CartMergeDialog({ serverCart }) {
  const show        = useCartStore((s) => s.showMergeDialog)
  const guestItems  = useCartStore((s) => s.guestItems)
  const clearGuest  = useCartStore((s) => s.clearGuestItems)
  const setDialog   = useCartStore((s) => s.setShowMergeDialog)
  const qc          = useQueryClient()
  const navigate    = useNavigate()
  const [selected, setSelected]   = useState('local')   // 'local' | 'server'
  const [loading, setLoading]     = useState(false)

  if (!show) return null

  // Normalise server items shape
  const serverItems = serverCart?.items ?? []

  const guestTotal  = guestItems.reduce((s, i) => s + (i.product?.price_amount ?? 0) * i.quantity, 0)
  const serverTotal = serverItems.reduce((s, i) => s + (i.product?.price_amount ?? i.unit_amount ?? 0) * i.quantity, 0)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      if (selected === 'local') {
        // Replace server cart with guest cart
        await cartApi.clear()
        for (const item of guestItems) {
          await cartApi.addItem({ product_id: item.product_id, quantity: item.quantity })
        }
        toast.success('Your local cart is now saved! 🛒')
      } else {
        // Just discard local cart, keep server cart
        toast.success('Keeping your saved cart ✅')
      }

      clearGuest()
      qc.invalidateQueries({ queryKey: ['cart'] })
      setDialog(false)

      // If user was heading to checkout, send them there now
      const pending = sessionStorage.getItem('pendingCheckout')
      if (pending) {
        sessionStorage.removeItem('pendingCheckout')
        navigate(pending)
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-[8px_8px_0px_rgba(0,0,0,0.1)]
                      w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-bounce-in">

        {/* ── Top header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🛒</span>
            <h2 className="font-display text-2xl text-stone-800">You have two carts!</h2>
          </div>
          <p className="text-stone-500 text-sm font-body ml-12">
            You had items saved before logging in. Click a cart to select it, then confirm.
          </p>
        </div>

        {/* ── Cart columns ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col sm:flex-row gap-4">

          {/* Local / Guest cart */}
          <CartColumn
            title="Local Cart"
            badge={`${guestItems.length} item${guestItems.length !== 1 ? 's' : ''}`}
            badgeColor="bg-brand-100 text-brand-700"
            items={guestItems}
            total={guestTotal}
            selected={selected === 'local'}
            onSelect={() => setSelected('local')}
            accentClass="bg-brand-500"
            borderClass="border-brand-400"
          />

          {/* VS divider */}
          <div className="flex sm:flex-col items-center justify-center gap-2 flex-shrink-0">
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-stone-200" />
            <span className="w-9 h-9 rounded-full bg-stone-100 border-2 border-stone-200
                             flex items-center justify-center text-xs font-bold text-stone-500 flex-shrink-0">
              VS
            </span>
            <div className="flex-1 h-px sm:h-auto sm:w-px bg-stone-200" />
          </div>

          {/* Server / Saved cart */}
          <CartColumn
            title="Saved Cart"
            badge={`${serverItems.length} item${serverItems.length !== 1 ? 's' : ''}`}
            badgeColor="bg-fresh-100 text-fresh-700"
            items={serverItems}
            total={serverTotal}
            selected={selected === 'server'}
            onSelect={() => setSelected('server')}
            accentClass="bg-fresh-500"
            borderClass="border-fresh-400"
          />
        </div>

        {/* ── Bottom action bar ── */}
        <div className="px-6 pb-6 pt-4 border-t border-stone-100 flex-shrink-0 flex items-center gap-4">
          {/* Selection summary */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-0.5">Selected</p>
            <p className="text-sm font-bold text-stone-800 truncate flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selected === 'local' ? 'bg-brand-500' : 'bg-fresh-500'}`} />
              {selected === 'local'
                ? `Local Cart — ${formatPrice(guestTotal)}`
                : `Saved Cart — ${formatPrice(serverTotal)}`}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {selected === 'local'
                ? 'This will replace your saved cart in the database'
                : 'Your local cart will be discarded'}
            </p>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm
                        border-2 shadow-fun transition-all duration-150
                        hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed
                        ${selected === 'local'
                          ? 'bg-brand-500 border-brand-600 text-white shadow-fun-brand'
                          : 'bg-fresh-500 border-fresh-600 text-white shadow-fun-green'}`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={16} strokeWidth={3} />
            )}
            {loading ? 'Saving...' : 'Use This Cart'}
            {!loading && <ArrowRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
