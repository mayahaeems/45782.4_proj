import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      setAuth: (user, token) => set({ user, token }),

      logout: () => set({ user: null, token: null }),

      isLoggedIn: () => !!get().token,

      isAdmin:    () => get().user?.role === 'admin',
      isDelivery: () => get().user?.role === 'delivery',
      isUser:     () => get().user?.role === 'user',
    }),
    {
      name: 'supermart-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
