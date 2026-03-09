import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import { formatPrice, formatDate } from '@/utils/format'
import Badge, { statusVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { capitalize } from '@/utils/format'

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useOrders()

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Package className="text-brand-500" size={28} />
        <h1 className="section-title">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="No orders yet"
          message="Place your first order and it'll appear here"
          action={<Link to="/" className="btn-primary">Start Shopping</Link>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-5
                         hover:-translate-y-1 hover:shadow-fun-lg transition-all duration-200 block"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-stone-800">Order #{order.id}</p>
                  <p className="text-sm text-stone-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={statusVariant(order.delivery_status)}>
                    {capitalize(order.delivery_status?.replace('_', ' '))}
                  </Badge>
                  <Badge variant={statusVariant(order.payment_status)}>
                    {capitalize(order.payment_status)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">
                  {order.items?.length ?? 0} items
                </span>
                <span className="font-display text-brand-600 text-lg">
                  {formatPrice(order.total_amount)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
