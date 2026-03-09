import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, MapPin, Package, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { deliveryApi } from '@/api/delivery'
import { useAuthStore } from '@/store/authStore'
import { formatPrice, formatDate, capitalize } from '@/utils/format'
import Badge, { statusVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

// ── Stats ──────────────────────────────────────────────────────────────────────

function StatsStrip({ active, doneCount }) {
  const onTheWay = active.filter((o) => o.delivery_status === 'on_the_way').length
  const assigned = active.filter((o) => o.delivery_status === 'assigned').length

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-2xl border-2 border-ocean-200 p-4 text-center">
        <p className="text-2xl font-display text-ocean-700">{onTheWay}</p>
        <p className="text-xs font-bold text-ocean-400 mt-0.5">On the way 🚚</p>
      </div>
      <div className="bg-white rounded-2xl border-2 border-amber-200 p-4 text-center">
        <p className="text-2xl font-display text-amber-700">{assigned}</p>
        <p className="text-xs font-bold text-amber-400 mt-0.5">Ready to go 📦</p>
      </div>
      <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 text-center">
        <p className="text-2xl font-display text-fresh-700">{doneCount}</p>
        <p className="text-xs font-bold text-stone-400 mt-0.5">Completed ✅</p>
      </div>
    </div>
  )
}

// ── Urgency badge ──────────────────────────────────────────────────────────────

function UrgencyBadge({ status }) {
  if (status === 'on_the_way')
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50
                       px-2 py-0.5 rounded-full border border-orange-200">
        <Zap size={9} /> In Progress
      </span>
    )
  if (status === 'assigned')
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50
                       px-2 py-0.5 rounded-full border border-amber-200">
        <Clock size={9} /> Ready
      </span>
    )
  return null
}

// ── Order card ─────────────────────────────────────────────────────────────────

function OrderCard({ order, muted = false }) {
  const itemCount = order.items?.length ?? 0

  return (
    <Link
      to={`/delivery/orders/${order.id}`}
      className={`bg-white rounded-2xl border-2 p-5 transition-all duration-200 block
        ${muted
          ? 'border-stone-100 opacity-70 hover:opacity-90'
          : order.delivery_status === 'on_the_way'
            ? 'border-ocean-300 shadow-fun hover:-translate-y-0.5 hover:shadow-fun-lg'
            : 'border-stone-200 shadow-fun hover:-translate-y-0.5 hover:shadow-fun-lg'
        }`}
    >
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
          ${order.delivery_status === 'on_the_way'  ? 'bg-ocean-100'
            : order.delivery_status === 'delivered' ? 'bg-fresh-100'
            : 'bg-stone-100'}`}>
          {order.delivery_status === 'on_the_way' ? (
            <span className="text-lg">🚚</span>
          ) : order.delivery_status === 'delivered' ? (
            <CheckCircle size={18} className="text-fresh-500" />
          ) : (
            <Package size={18} className="text-stone-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-stone-800">Order #{order.id}</span>
            <UrgencyBadge status={order.delivery_status} />
            {muted && (
              <Badge variant={statusVariant(order.delivery_status)}>
                {capitalize(order.delivery_status?.replace('_', ' '))}
              </Badge>
            )}
          </div>

          {/* Customer name (from order.user — delivery-safe: name + phone only) */}
          {order.user?.full_name && (
            <p className="text-stone-600 text-sm font-semibold mb-0.5">
              👤 {order.user.full_name}
            </p>
          )}

          <div className="flex items-start gap-1.5 text-stone-500 text-sm mb-1">
            <MapPin size={13} className="text-stone-400 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{order.address ?? '—'}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="font-display text-lg text-brand-600">{formatPrice(order.total_amount)}</p>
          <ChevronRight size={16} className="text-stone-300" />
        </div>
      </div>
    </Link>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DeliveryDashboard() {
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('active')

  // Active orders — only assigned/on_the_way for this delivery person
  const { data: active = [], isLoading: loadingActive } = useQuery({
    queryKey: ['delivery-orders', 'active'],
    queryFn: () => deliveryApi.myOrders().then((r) => r.data),
    refetchInterval: 30_000,
  })

  // Completed orders — delivered/canceled for this delivery person
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['delivery-orders', 'history'],
    queryFn: () => deliveryApi.myHistory().then((r) => r.data),
    enabled: tab === 'done',  // lazy-load when user switches tab
  })

  const isLoading = loadingActive || (tab === 'done' && loadingHistory)

  if (isLoading && active.length === 0)
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">

      {/* Hero */}
      <div className="bg-gradient-to-r from-ocean-500 to-sky-400 rounded-3xl p-7 text-white
                      border-2 border-ocean-600 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-8xl opacity-10 select-none rotate-12">🚚</div>
        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center
                          text-3xl flex-shrink-0">
            🚚
          </div>
          <div>
            <h1 className="text-3xl font-display">
              Hey {user?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-sky-100 mt-0.5">
              {active.length > 0
                ? `${active.length} active order${active.length !== 1 ? 's' : ''} waiting for you`
                : 'All caught up — no active orders right now'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsStrip active={active} doneCount={history.length} />

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-2xl p-1">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
            ${tab === 'active'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'}`}
        >
          🔥 Active ({active.length})
        </button>
        <button
          onClick={() => setTab('done')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
            ${tab === 'done'
              ? 'bg-white text-stone-800 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'}`}
        >
          ✅ Completed ({history.length})
        </button>
      </div>

      {/* Orders */}
      {tab === 'active' && (
        <div className="flex flex-col gap-3">
          {active.length === 0 ? (
            <EmptyState
              emoji="😴"
              title="No active orders"
              message="You're all caught up! New orders assigned to you will appear here."
            />
          ) : (
            active.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      )}

      {tab === 'done' && (
        <div className="flex flex-col gap-3">
          {loadingHistory ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : history.length === 0 ? (
            <EmptyState
              emoji="📭"
              title="No completed orders yet"
              message="Delivered orders will appear here."
            />
          ) : (
            history.map((order) => <OrderCard key={order.id} order={order} muted />)
          )}
        </div>
      )}
    </div>
  )
}