import { Outlet, NavLink, Link } from 'react-router-dom'
import { Package, LogOut, User } from 'lucide-react'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

export default function DeliveryLayout() {
  const logout = useLogout()
  const user   = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-stone-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/delivery" className="flex items-center gap-2">
            <span className="text-2xl">🚚</span>
            <div>
              <p className="font-display text-xl text-ocean-600">DeliveryHub</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Profile link */}
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-sm font-semibold text-stone-500
                         hover:text-brand-600 transition-colors px-3 py-2 hover:bg-stone-50 rounded-xl"
            >
              <div className="w-7 h-7 bg-ocean-100 rounded-full flex items-center justify-center
                              text-ocean-700 font-bold text-xs flex-shrink-0">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:inline">{user?.full_name?.split(' ')[0]}</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm font-semibold
                         text-stone-500 hover:text-red-500 transition-colors px-3 py-2
                         hover:bg-red-50 rounded-xl"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}