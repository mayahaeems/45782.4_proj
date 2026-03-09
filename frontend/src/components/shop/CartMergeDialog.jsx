import { useCartStore } from '@/store/cartStore'
import { useCartMergeActions } from '@/hooks/useCart'

/**
 * Global merge dialog — place once in ShopLayout.
 * Shows whenever a logged-in user also has items in their local (guest) cart.
 */
export default function CartMergeDialog() {
  const show = useCartStore((s) => s.showMergeDialog)
  const { useLocalCart, useServerCart, guestItems } = useCartMergeActions()

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">🛒</span>
          <h2 className="text-2xl font-display text-stone-800">You have two carts!</h2>
          <p className="text-stone-500 mt-2 font-body">
            You have {guestItems.length} item{guestItems.length !== 1 ? 's' : ''} saved
            locally from before you logged in. Which cart would you like to keep?
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={useLocalCart}
            className="w-full p-4 rounded-2xl border-2 border-brand-300 bg-brand-50
                       hover:border-brand-500 transition-colors text-left"
          >
            <p className="font-bold text-brand-700">Use my local cart</p>
            <p className="text-sm text-brand-600">
              {guestItems.length} item{guestItems.length !== 1 ? 's' : ''} — replaces your saved cart
            </p>
          </button>

          <button
            onClick={useServerCart}
            className="w-full p-4 rounded-2xl border-2 border-stone-200 bg-stone-50
                       hover:border-stone-400 transition-colors text-left"
          >
            <p className="font-bold text-stone-700">Use my saved cart</p>
            <p className="text-sm text-stone-500">Keep the cart from your account, discard local</p>
          </button>
        </div>
      </div>
    </div>
  )
}
