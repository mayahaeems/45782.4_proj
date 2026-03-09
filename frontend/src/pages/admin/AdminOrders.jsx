import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, ChevronDown, ChevronUp, Package, MapPin, Phone, User, Truck, CreditCard, Clock, Trash2 } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { usersApi } from '@/api/users'
import { deliveryApi } from '@/api/delivery'
import { formatPrice, formatDate, capitalize } from '@/utils/format'
import Badge, { statusVariant } from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import ProductImage from '@/components/ui/ProductImage'
import Button from '@/components/ui/Button'

const DELIVERY_STATUSES = ['pending', 'processing', 'assigned', 'on_the_way', 'delivered', 'canceled']
const PAYMENT_STATUSES  = ['pending', 'paid', 'failed', 'refunded']

const STATUS_COLORS = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  assigned:   'bg-purple-50 text-purple-700 border-purple-200',
  on_the_way: 'bg-ocean-50 text-ocean-700 border-ocean-200',
  delivered:  'bg-fresh-50 text-fresh-700 border-fresh-200',
  canceled:   'bg-red-50 text-red-600 border-red-200',
  paid:       'bg-fresh-50 text-fresh-700 border-fresh-200',
  failed:     'bg-red-50 text-red-600 border-red-200',
  refunded:   'bg-stone-50 text-stone-500 border-stone-200',
}

// ── Order Detail Modal ─────────────────────────────────────────────────────────
function OrderDetail({ order: initialOrder, onClose }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('details') // details | items | assign
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Always read the freshest order from the cache so status changes reflect immediately
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.list().then(r => r.data) })
  const order = orders.find((o) => o.id === initialOrder.id) ?? initialOrder

  const { data: deliveryUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    select: (users) => users.filter((u) => u.role === 'delivery'),
  })

  const updateStatus = useMutation({
    mutationFn: ({ delivery_status, payment_status }) =>
      ordersApi.update(order.id, { ...(delivery_status && { delivery_status }), ...(payment_status && { payment_status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order updated!') },
    onError: () => toast.error('Update failed'),
  })

  const assignDelivery = useMutation({
    mutationFn: (delivery_user_id) => deliveryApi.assign(order.id, { delivery_user_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Delivery person assigned!') },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to assign'),
  })

  const deleteOrder = useMutation({
    mutationFn: () => ordersApi.delete(order.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order deleted')
      onClose()
    },
    onError: () => toast.error('Delete failed'),
  })

  const tabs = [
    { key: 'details', label: '📋 Details' },
    { key: 'items', label: `📦 Items (${order.items?.length ?? 0})` },
    { key: 'assign', label: '🚚 Delivery' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Status badges */}
      <div className="flex gap-3 flex-wrap">
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${STATUS_COLORS[order.delivery_status] ?? 'bg-stone-50 text-stone-600 border-stone-200'}`}>
          🚚 {capitalize(order.delivery_status?.replace('_', ' '))}
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${STATUS_COLORS[order.payment_status] ?? 'bg-stone-50 text-stone-600 border-stone-200'}`}>
          💳 {capitalize(order.payment_status)}
        </div>
        <div className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-stone-50 text-stone-600 border-stone-200">
          {formatDate(order.created_at)}
        </div>
      </div>

      {/* Delete button */}
      <div className="flex justify-end">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 border-2 border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} /> Delete Order
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-red-600">Delete order #{order.id}?</span>
            <button
              onClick={() => deleteOrder.mutate()}
              disabled={deleteOrder.isPending}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleteOrder.isPending ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-stone-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-bold transition-colors rounded-t-xl
              ${activeTab === t.key
                ? 'text-brand-600 border-b-2 border-brand-500 -mb-[2px] bg-brand-50'
                : 'text-stone-400 hover:text-stone-600'
              }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <div className="flex flex-col gap-5">
          {/* Customer */}
          <div className="bg-stone-50 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Customer</p>
            <div className="flex items-center gap-2 text-sm text-stone-700">
              <User size={14} className="text-stone-400" />
              <span className="font-semibold">{order.user?.full_name ?? '—'}</span>
            </div>
            {(order.phone_number || order.user?.default_phone) && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-stone-400" />
                <a href={`tel:${order.phone_number ?? order.user?.default_phone}`}
                   className="text-ocean-600 font-semibold hover:underline">
                  {order.phone_number ?? order.user?.default_phone}
                </a>
              </div>
            )}
            {order.address && (
              <div className="flex items-start gap-2 text-sm text-stone-600">
                <MapPin size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
                <span>{order.address}</span>
              </div>
            )}
          </div>

          {/* Financials */}
          <div className="bg-stone-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">Financials</p>
            <div className="flex flex-col gap-1.5 text-sm">
              {order.subtotal_amount > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal_amount)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shipping_amount)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-fresh-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg border-t border-stone-200 pt-2 mt-1">
                <span>Total</span>
                <span className="text-brand-600">{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Status controls */}
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Delivery Status</p>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus.mutate({ delivery_status: s })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                    ${order.delivery_status === s
                      ? 'bg-brand-500 text-white border-brand-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    }`}
                >{capitalize(s.replace('_', ' '))}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Payment Status</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus.mutate({ payment_status: s })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                    ${order.payment_status === s
                      ? 'bg-fresh-500 text-white border-fresh-600'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    }`}
                >{capitalize(s)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Items */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                <ProductImage storageKey={item.product?.main_image?.storage_key} alt={item.product?.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 text-sm">{item.product?.name ?? `Product #${item.product_id}`}</p>
                <p className="text-stone-400 text-xs">
                  {formatPrice(item.unit_amount)} × {item.quantity}
                </p>
              </div>
              <p className="font-bold text-stone-800 text-sm">
                {formatPrice((item.unit_amount ?? 0) * item.quantity)}
              </p>
            </div>
          ))}
          <div className="border-t-2 border-stone-100 pt-3 flex justify-between">
            <span className="font-display text-lg">Total</span>
            <span className="font-display text-xl text-brand-600">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      )}

      {/* Tab: Assign Delivery */}
      {activeTab === 'assign' && (
        <div className="flex flex-col gap-4">
          {order.delivery_user && (
            <div className="bg-ocean-50 rounded-2xl p-4 flex items-center gap-3 border border-ocean-200">
              <Truck size={18} className="text-ocean-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-ocean-600">Currently Assigned</p>
                <p className="font-semibold text-stone-800">{order.delivery_user.full_name}</p>
                {order.delivery_user.default_phone && (
                  <a href={`tel:${order.delivery_user.default_phone}`} className="text-xs text-ocean-600 hover:underline">
                    {order.delivery_user.default_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {['delivered', 'canceled'].includes(order.delivery_status) ? (
            <div className="text-center py-6 text-stone-400 text-sm">
              This order is {order.delivery_status} — cannot reassign.
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-stone-600">
                {order.delivery_user ? 'Reassign to:' : 'Assign a delivery person:'}
              </p>
              {deliveryUsers.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-4">No delivery users available</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {deliveryUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => assignDelivery.mutate(u.id)}
                      disabled={assignDelivery.isPending}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left
                        ${order.delivery_user?.id === u.id
                          ? 'border-ocean-400 bg-ocean-50'
                          : 'border-stone-200 hover:border-ocean-300 hover:bg-ocean-50'
                        }`}
                    >
                      <div className="w-9 h-9 bg-ocean-100 rounded-full flex items-center justify-center
                                      text-ocean-600 font-bold text-sm flex-shrink-0">
                        {u.full_name?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-stone-800 text-sm">{u.full_name}</p>
                        {u.default_phone && <p className="text-stone-400 text-xs">{u.default_phone}</p>}
                      </div>
                      {order.delivery_user?.id === u.id && (
                        <span className="text-xs font-bold text-ocean-600 bg-ocean-100 px-2 py-1 rounded-lg">
                          Current
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Summary stats bar ──────────────────────────────────────────────────────────
function OrderStats({ orders }) {
  const paid = orders.filter((o) => o.payment_status === 'paid')
  const revenue = paid.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const pending = orders.filter((o) => o.delivery_status === 'pending').length
  const inProgress = orders.filter((o) => ['processing', 'assigned', 'on_the_way'].includes(o.delivery_status)).length
  const delivered = orders.filter((o) => o.delivery_status === 'delivered').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-gradient-to-br from-brand-500 to-orange-400 rounded-2xl p-4 text-white">
        <p className="text-orange-100 text-xs font-semibold mb-1">Revenue</p>
        <p className="text-2xl font-display">{formatPrice(revenue)}</p>
      </div>
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <p className="text-amber-600 text-xs font-semibold mb-1">⏳ Pending</p>
        <p className="text-2xl font-display text-amber-700">{pending}</p>
      </div>
      <div className="bg-ocean-50 rounded-2xl p-4 border border-ocean-200">
        <p className="text-ocean-600 text-xs font-semibold mb-1">🚚 In Progress</p>
        <p className="text-2xl font-display text-ocean-700">{inProgress}</p>
      </div>
      <div className="bg-fresh-50 rounded-2xl p-4 border border-fresh-200">
        <p className="text-fresh-600 text-xs font-semibold mb-1">✅ Delivered</p>
        <p className="text-2xl font-display text-fresh-700">{delivered}</p>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', {}],
    queryFn: () => ordersApi.list().then((r) => r.data),
  })

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      String(o.id).includes(search) ||
      o.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.address?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.delivery_status === filterStatus
    return matchSearch && matchStatus
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-display text-stone-800">Orders 🛍️</h1>

      <OrderStats orders={orders} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, address..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...DELIVERY_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                ${filterStatus === s
                  ? 'bg-brand-500 text-white border-brand-600'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                }`}
            >{s === 'all' ? 'All' : capitalize(s.replace('_', ' '))}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-100 bg-stone-50">
              <th className="text-left p-4 font-bold text-stone-600">#</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden md:table-cell">Customer</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden lg:table-cell">Address</th>
              <th className="text-left p-4 font-bold text-stone-600">Delivery</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden sm:table-cell">Payment</th>
              <th className="text-left p-4 font-bold text-stone-600">Total</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden lg:table-cell">
                <Clock size={13} className="inline mr-1" />Date
              </th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.id}
                className="border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer"
                onClick={() => setSelected(order)}
              >
                <td className="p-4 font-bold text-stone-700">#{order.id}</td>
                <td className="p-4 hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center
                                    text-brand-600 font-bold text-xs flex-shrink-0">
                      {order.user?.full_name?.[0] ?? '?'}
                    </div>
                    <span className="text-stone-600">{order.user?.full_name ?? '—'}</span>
                  </div>
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <span className="text-stone-500 text-xs line-clamp-1 max-w-[150px]">{order.address ?? '—'}</span>
                </td>
                <td className="p-4">
                  <Badge variant={statusVariant(order.delivery_status)}>
                    {capitalize(order.delivery_status?.replace('_', ' '))}
                  </Badge>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <Badge variant={statusVariant(order.payment_status)}>
                    {capitalize(order.payment_status)}
                  </Badge>
                </td>
                <td className="p-4 font-display text-brand-600">{formatPrice(order.total_amount)}</td>
                <td className="p-4 hidden lg:table-cell text-stone-400 text-xs">{formatDate(order.created_at)}</td>
                <td className="p-4">
                  <span className="text-xs font-bold text-brand-500 hover:underline">Manage →</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-stone-400">No orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Order #${selected?.id}`}
        size="md"
      >
        {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </div>
  )
}