import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { cartApi } from '@/api/cart'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'

// ── Main cart hook ──────────────────────────────────────────────────────────
export const useCart = () => {
  const { setItemCount, guestItems, setShowMergeDialog } = useCartStore()
  const isLoggedIn = useAuthStore((s) => !!s.token)
  const qc = useQueryClient()
  const mergeHandledRef = useRef(false)

  const query = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get().then((r) => r.data),
    enabled: isLoggedIn,
    staleTime: 0,
  })

  // ── Merge / auto-save on login ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      mergeHandledRef.current = false
      return
    }
    if (!query.data) return
    if (mergeHandledRef.current) return

    const currentGuestItems = useCartStore.getState().guestItems
    if (currentGuestItems.length === 0) {
      mergeHandledRef.current = true
      return
    }

    mergeHandledRef.current = true
    const dbItems = query.data.items ?? []

    if (dbItems.length === 0) {
      // Auto-save: DB empty → push local to DB silently
      ;(async () => {
        try {
          const itemsToSave = useCartStore.getState().guestItems
          for (const item of itemsToSave) {
            await cartApi.addItem({ product_id: item.product_id, quantity: item.quantity })
          }
          useCartStore.getState().clearGuestItems()
          qc.invalidateQueries({ queryKey: ['cart'] })
          toast.success('העגלה נשמרה! 🛒')
        } catch (e) {
          console.error('Auto-save cart error:', e)
          toast.error('שגיאה בשמירת העגלה')
          mergeHandledRef.current = false
        }
      })()
    } else {
      // Both carts have items → ask user
      setShowMergeDialog(true)
    }
  }, [isLoggedIn, query.data])

  // ── Sync navbar badge ───────────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      const count = query.data?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
      setItemCount(count)
    } else {
      const count = guestItems.reduce((s, i) => s + i.quantity, 0)
      setItemCount(count)
    }
  }, [query.data, guestItems, isLoggedIn])

  if (!isLoggedIn) {
    return { data: { items: guestItems }, isLoading: false, isGuest: true }
  }

  return { ...query, isGuest: false }
}

// ── Add to cart ─────────────────────────────────────────────────────────────
// Always reads auth state fresh inside mutationFn to avoid stale closure
export const useAddToCart = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
      // Read fresh from store — never use closure values here
      const token = useAuthStore.getState().token
      if (!token) {
        useCartStore.getState().addGuestItem(product, quantity)
        return
      }
      return cartApi.addItem({ product_id: product.id, quantity })
    },
    onSuccess: () => {
      const token = useAuthStore.getState().token
      if (token) qc.invalidateQueries({ queryKey: ['cart'] })
      toast.success('נוסף לעגלה! 🛒')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'שגיאה בהוספה לעגלה'),
  })
}

// ── Update item quantity ────────────────────────────────────────────────────
export const useUpdateCartItem = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, productId, quantity }) => {
      const token = useAuthStore.getState().token
      if (!token) {
        useCartStore.getState().updateGuestItem(productId, quantity)
        return Promise.resolve()
      }
      return cartApi.updateItem(itemId, { quantity })
    },
    onSuccess: () => {
      if (useAuthStore.getState().token) qc.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: () => toast.error('שגיאה בעדכון הכמות'),
  })
}

// ── Remove item ─────────────────────────────────────────────────────────────
export const useRemoveCartItem = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, productId }) => {
      const token = useAuthStore.getState().token
      if (!token) {
        useCartStore.getState().removeGuestItem(productId)
        return Promise.resolve()
      }
      return cartApi.removeItem(itemId)
    },
    onSuccess: () => {
      if (useAuthStore.getState().token) qc.invalidateQueries({ queryKey: ['cart'] })
      toast.success('הוסר מהעגלה')
    },
  })
}

// ── Clear entire cart ───────────────────────────────────────────────────────
export const useClearCart = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const token = useAuthStore.getState().token
      if (!token) {
        useCartStore.getState().clearGuestItems()
        return Promise.resolve()
      }
      return cartApi.clear()
    },
    onSuccess: () => {
      if (useAuthStore.getState().token) qc.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
