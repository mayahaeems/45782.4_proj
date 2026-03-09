import { Outlet, NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, LogOut, ScrollText
} from 'lucide-react'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

const links = [
  { to: '/admin',            icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products',   icon: Package,          label: 'Products' },
  { to: '/admin/categories', icon: Tag,              label: 'Categories' },
  { to: '/admin/orders',     icon: ShoppingBag,      label: 'Orders' },
  { to: '/admin/users',      icon: Users,            label: 'Users' },
  { to: '/admin/logs',       icon: ScrollText,       label: 'Logs' },
]

export default function AdminLayout() {
  const logout = useLogout()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen flex bg-stone-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r-2 border-stone-100 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b-2 border-stone-100">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="font-display text-xl text-brand-600">SuperMart</p>
              <p className="text-xs text-stone-400 font-semibold">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-150
                 ${isActive
                   ? 'bg-brand-500 text-white shadow-fun-brand'
                   : 'text-stone-600 hover:bg-stone-100'
                 }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-4 border-t-2 border-stone-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-brand-600">
                {user?.full_name?.trim()?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-stone-800 text-sm truncate">{user?.full_name}</p>
              <p className="text-xs text-stone-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold
                       text-stone-500 hover:text-red-500 hover:bg-red-50
                       rounded-xl transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}