import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      itemCount: 0,
      guestItems: [], // [{ product_id, quantity, product }]
      showMergeDialog: false,

      setItemCount: (count) => set({ itemCount: count }),
      setShowMergeDialog: (val) => set({ showMergeDialog: val }),

      // Full reset on logout — clears guest cart too (user was logged in, no local cart to keep)
      reset: () => set({ itemCount: 0, guestItems: [], showMergeDialog: false }),

      addGuestItem: (product, quantity = 1) => {
        const items = get().guestItems
        const existing = items.find((i) => i.product_id === product.id)
        const updated = existing
          ? items.map((i) =>
              i.product_id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          : [...items, { product_id: product.id, quantity, product }]
        set({
          guestItems: updated,
          itemCount: updated.reduce((s, i) => s + i.quantity, 0),
        })
      },

      updateGuestItem: (productId, quantity) => {
        const items =
          quantity <= 0
            ? get().guestItems.filter((i) => i.product_id !== productId)
            : get().guestItems.map((i) =>
                i.product_id === productId ? { ...i, quantity } : i
              )
        set({ guestItems: items, itemCount: items.reduce((s, i) => s + i.quantity, 0) })
      },

      removeGuestItem: (productId) => {
        const items = get().guestItems.filter((i) => i.product_id !== productId)
        set({ guestItems: items, itemCount: items.reduce((s, i) => s + i.quantity, 0) })
      },

      clearGuestItems: () => set({ guestItems: [], itemCount: 0 }),

      setGuestItems: (items) =>
        set({ guestItems: items, itemCount: items.reduce((s, i) => s + i.quantity, 0) }),
    }),
    {
      name: 'supermart-cart',
      partialize: (state) => ({ guestItems: state.guestItems }),
    }
  )
)