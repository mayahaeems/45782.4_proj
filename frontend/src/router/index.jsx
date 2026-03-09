import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import ShopLayout     from '@/components/layout/ShopLayout'
import AdminLayout    from '@/components/layout/AdminLayout'
import DeliveryLayout from '@/components/layout/DeliveryLayout'

// Auth pages
import LoginPage    from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Shop pages
import CatalogPage      from '@/pages/shop/CatalogPage'
import ProductPage      from '@/pages/shop/ProductPage'
import CartPage         from '@/pages/shop/CartPage'
import CheckoutPage     from '@/pages/shop/CheckoutPage'
import OrderSuccessPage from '@/pages/shop/OrderSuccessPage'

// Order pages
import OrdersPage      from '@/pages/orders/OrdersPage'
import OrderDetailPage from '@/pages/orders/OrderDetailPage'

// Admin pages
import AdminDashboard  from '@/pages/admin/AdminDashboard'
import AdminProducts   from '@/pages/admin/AdminProducts'
import AdminCategories from '@/pages/admin/AdminCategories'
import AdminOrders     from '@/pages/admin/AdminOrders'
import AdminUsers      from '@/pages/admin/AdminUsers'
import AdminLogs       from '@/pages/admin/AdminLogs'

// Delivery pages
import DeliveryDashboard from '@/pages/delivery/DeliveryDashboard'
import DeliveryOrder     from '@/pages/delivery/DeliveryOrder'

// ── Guards ────────────────────────────────────────────────────────────────────

const RequireAuth = ({ children }) => {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

const RequireAdmin = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const RequireDelivery = ({ children }) => {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'delivery' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const RedirectIfLoggedIn = ({ children }) => {
  const { token, user } = useAuthStore()
  if (!token) return children
  if (user?.role === 'admin')    return <Navigate to="/admin" replace />
  if (user?.role === 'delivery') return <Navigate to="/delivery" replace />
  return <Navigate to="/" replace />
}

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Auth
  {
    path: '/login',
    element: <RedirectIfLoggedIn><LoginPage /></RedirectIfLoggedIn>,
  },
  {
    path: '/register',
    element: <RedirectIfLoggedIn><RegisterPage /></RedirectIfLoggedIn>,
  },

  // Shop
  {
    element: <ShopLayout />,
    children: [
      { path: '/',             element: <CatalogPage /> },
      { path: '/products/:id', element: <ProductPage /> },
      { path: '/cart',         element: <CartPage /> },
      {
        path: '/checkout',
        element: <RequireAuth><CheckoutPage /></RequireAuth>,
      },
      {
        path: '/checkout/success',
        element: <RequireAuth><OrderSuccessPage /></RequireAuth>,
      },
      {
        path: '/orders',
        element: <RequireAuth><OrdersPage /></RequireAuth>,
      },
      {
        path: '/orders/:id',
        element: <RequireAuth><OrderDetailPage /></RequireAuth>,
      },
    ],
  },

  // Admin
  {
    path: '/admin',
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true,            element: <AdminDashboard /> },
      { path: 'products',       element: <AdminProducts /> },
      { path: 'categories',     element: <AdminCategories /> },
      { path: 'orders',         element: <AdminOrders /> },
      { path: 'users',          element: <AdminUsers /> },
      { path: 'logs',           element: <AdminLogs /> },
    ],
  },

  // Delivery
  {
    path: '/delivery',
    element: <RequireDelivery><DeliveryLayout /></RequireDelivery>,
    children: [
      { index: true,        element: <DeliveryDashboard /> },
      { path: 'orders/:id', element: <DeliveryOrder /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])