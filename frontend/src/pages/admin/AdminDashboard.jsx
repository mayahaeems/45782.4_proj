import { useQuery } from '@tanstack/react-query'
import { Package, Tag, ShoppingBag, Users, TrendingUp, AlertTriangle, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import { ordersApi } from '@/api/orders'
import { usersApi } from '@/api/users'
import { formatPrice, formatDate, capitalize } from '@/utils/format'
import Badge, { statusVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { Link } from 'react-router-dom'

function StatCard({ icon: Icon, label, value, color, to, sub }) {
  return (
    <Link to={to} className="block group">
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6
                       hover:-translate-y-1 hover:shadow-fun-lg transition-all duration-200">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <p className="text-3xl font-display text-stone-800">{value}</p>
        <p className="text-stone-500 font-body text-sm mt-1">{label}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
        <div className="flex items-center gap-1 mt-3 text-xs font-bold text-stone-400
                        group-hover:text-brand-500 transition-colors">
          View all <ArrowRight size={11} />
        </div>
      </div>
    </Link>
  )
}

function AlertCard({ icon, label, value, color, to, urgent }) {
  const content = (
    <div className={`rounded-2xl border-2 p-4 flex items-center gap-4 transition-all
      ${urgent ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-amber-50 border-amber-200 hover:border-amber-300'}`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className={`font-bold text-lg ${urgent ? 'text-red-600' : 'text-amber-700'}`}>{value}</p>
        <p className={`text-xs font-semibold ${urgent ? 'text-red-400' : 'text-amber-500'}`}>{label}</p>
      </div>
      <ArrowRight size={14} className={urgent ? 'text-red-400' : 'text-amber-400'} />
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function AdminDashboard() {
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', {}],
    queryFn: () => productsApi.list().then((r) => r.data),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', {}],
    queryFn: () => ordersApi.list().then((r) => r.data),
  })
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  })

  const revenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  const pendingOrders   = orders.filter((o) => o.delivery_status === 'pending').length
  const processingOrders = orders.filter((o) => o.delivery_status === 'processing').length
  const inDelivery      = orders.filter((o) => o.delivery_status === 'on_the_way').length
  const deliveredToday  = orders.filter((o) => {
    const d = new Date(o.updated_at)
    const now = new Date()
    return o.delivery_status === 'delivered' &&
      d.toDateString() === now.toDateString()
  }).length

  const outOfStock = products.filter((p) => p.quantity === 0).length
  const lowStock   = products.filter((p) => p.quantity > 0 && p.quantity <= 5).length

  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)

  if (loadingProducts || loadingOrders) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display text-stone-800">Dashboard 📊</h1>
        <p className="text-stone-400 font-body mt-1">Here's what's happening right now.</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package} label="Products" value={products.length}
          color="bg-brand-500" to="/admin/products"
          sub={`${products.filter((p) => p.is_active !== false).length} active`}
        />
        <StatCard
          icon={Tag} label="Categories" value={categories.length}
          color="bg-fresh-500" to="/admin/categories"
        />
        <StatCard
          icon={ShoppingBag} label="Orders" value={orders.length}
          color="bg-ocean-500" to="/admin/orders"
          sub={`${pendingOrders} pending`}
        />
        <StatCard
          icon={Users} label="Users" value={users.length}
          color="bg-berry-500" to="/admin/users"
          sub={`${users.filter((u) => u.role === 'delivery').length} delivery`}
        />
      </div>

      {/* Revenue + delivery live */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-500 to-orange-400 rounded-3xl p-6 text-white border-2 border-brand-600 md:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-orange-200" />
            <p className="text-orange-100 text-sm font-semibold">Total Revenue</p>
          </div>
          <p className="text-4xl font-display">{formatPrice(revenue)}</p>
          <p className="text-orange-100 text-xs mt-2">
            from {orders.filter((o) => o.payment_status === 'paid').length} paid orders
          </p>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-display text-stone-800">{pendingOrders + processingOrders}</p>
              <p className="text-xs font-semibold text-stone-400">Awaiting dispatch</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ocean-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🚚</span>
            </div>
            <div>
              <p className="text-2xl font-display text-stone-800">{inDelivery}</p>
              <p className="text-xs font-semibold text-stone-400">On the way</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fresh-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-fresh-600" />
            </div>
            <div>
              <p className="text-2xl font-display text-stone-800">{deliveredToday}</p>
              <p className="text-xs font-semibold text-stone-400">Delivered today</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-berry-100 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-berry-600" />
            </div>
            <div>
              <p className="text-2xl font-display text-stone-800">{users.filter((u) => u.role === 'user').length}</p>
              <p className="text-xs font-semibold text-stone-400">Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts row */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {outOfStock > 0 && (
            <AlertCard
              icon="❌" label="Products out of stock" value={outOfStock}
              urgent to="/admin/products"
            />
          )}
          {lowStock > 0 && (
            <AlertCard
              icon="⚠️" label="Products low on stock (≤5)" value={lowStock}
              to="/admin/products"
            />
          )}
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-100">
          <h2 className="font-display text-xl">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm font-bold text-brand-500 hover:underline flex items-center gap-1">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="text-left px-6 py-3 font-bold text-stone-500 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-6 py-3 font-bold text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Customer</th>
                <th className="text-left px-6 py-3 font-bold text-stone-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 font-bold text-stone-500 text-xs uppercase tracking-wide">Total</th>
                <th className="text-left px-6 py-3 font-bold text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-3 font-bold text-stone-700">#{order.id}</td>
                  <td className="px-6 py-3 text-stone-600 hidden md:table-cell">
                    {order.user?.full_name ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant={statusVariant(order.delivery_status)}>
                      {capitalize(order.delivery_status?.replace('_', ' '))}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 font-display text-brand-600">{formatPrice(order.total_amount)}</td>
                  <td className="px-6 py-3 text-stone-400 text-xs hidden sm:table-cell">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}