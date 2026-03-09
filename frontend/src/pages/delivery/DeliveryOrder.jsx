import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Package, CheckSquare, Square, Navigation, MessageCircle, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { deliveryApi } from '@/api/delivery'
import { formatPrice, capitalize } from '@/utils/format'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ProductImage from '@/components/ui/ProductImage'

const NEXT_STATUS = {
  assigned:   { next: 'on_the_way', label: 'Start Delivery', emoji: '🚀', color: 'primary' },
  on_the_way: { next: 'delivered',  label: 'Mark Delivered', emoji: '✅', color: 'green' },
}

const STATUS_LABEL = {
  pending:    { label: 'Pending',    color: 'text-amber-600 bg-amber-50 border-amber-200' },
  processing: { label: 'Processing', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  assigned:   { label: 'Assigned',   color: 'text-purple-600 bg-purple-50 border-purple-200' },
  on_the_way: { label: 'On the Way', color: 'text-ocean-600 bg-ocean-50 border-ocean-200' },
  delivered:  { label: 'Delivered',  color: 'text-fresh-600 bg-fresh-50 border-fresh-200' },
  canceled:   { label: 'Canceled',   color: 'text-red-500 bg-red-50 border-red-200' },
}

export default function DeliveryOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [checkedItems, setCheckedItems] = useState({})

  const { data: order, isLoading } = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => deliveryApi.getOrder(id).then((r) => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ status }) => deliveryApi.updateStatus(id, { delivery_status: status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-order', id] })
      qc.invalidateQueries({ queryKey: ['delivery-orders'] })
      toast.success(order?.delivery_status === 'on_the_way' ? '🎉 Order delivered!' : '🚀 Delivery started!')
      if (order?.delivery_status === 'on_the_way') navigate('/delivery')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const toggleItem = (itemId) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!order) return <p className="text-center py-20 text-stone-500">Order not found</p>

  const action     = NEXT_STATUS[order.delivery_status]
  const statusInfo = STATUS_LABEL[order.delivery_status]
  const phone      = order.phone_number ?? order.user?.default_phone
  const address    = order.address
  const allChecked = order.items?.every((item) => checkedItems[item.id])
  const mapsUrl    = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5 pb-8">
      <Link to="/delivery" className="btn-ghost flex items-center gap-2 w-fit text-stone-500 hover:text-stone-700">
        <ArrowLeft size={16} /> Back to orders
      </Link>

      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display text-stone-800">Order #{order.id}</h1>
            <p className="text-stone-400 text-sm mt-0.5">{order.items?.length ?? 0} items</p>
          </div>
          {statusInfo && (
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 mb-5">
          {address && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-ocean-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={14} className="text-ocean-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-700">{address}</p>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-ocean-600 font-bold hover:underline flex items-center gap-1 mt-1">
                    <Navigation size={10} /> Open in Maps
                  </a>
                )}
              </div>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-fresh-50 flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-fresh-500" />
              </div>
              <div className="flex items-center gap-3 flex-1">
                <a href={`tel:${phone}`} className="text-sm font-semibold text-stone-700 hover:text-ocean-600 transition-colors">
                  {phone}
                </a>
                <a href={`tel:${phone}`}
                  className="text-xs font-bold text-white bg-fresh-500 hover:bg-fresh-600 px-3 py-1.5 rounded-lg transition-colors">
                  📞 Call
                </a>
                <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-white bg-[#25D366] hover:bg-[#20BD5A] px-3 py-1.5 rounded-lg transition-colors">
                  💬 WhatsApp
                </a>
              </div>
            </div>
          )}

          {order.user?.full_name && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-brand-600">{order.user.full_name[0]}</span>
              </div>
              <span className="text-sm font-semibold text-stone-700">{order.user.full_name}</span>
            </div>
          )}
        </div>

        {action && (
          <Button
            loading={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ status: action.next })}
            size="lg"
            className="w-full justify-center text-base"
          >
            {action.emoji} {action.label}
          </Button>
        )}

        {order.delivery_status === 'delivered' && (
          <div className="flex items-center justify-center gap-2 py-3 bg-fresh-50 rounded-2xl border border-fresh-200">
            <span className="text-2xl">🎉</span>
            <span className="font-bold text-fresh-700">Delivered successfully!</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Package size={20} className="text-brand-500" /> Items Checklist
          </h2>
          {order.items?.length > 0 && (
            <span className={`text-xs font-bold px-2 py-1 rounded-lg
              ${allChecked ? 'text-fresh-700 bg-fresh-50' : 'text-stone-400 bg-stone-100'}`}>
              {Object.values(checkedItems).filter(Boolean).length}/{order.items.length} checked
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {order.items?.map((item) => {
            const checked = checkedItems[item.id]
            return (
              <button key={item.id} onClick={() => toggleItem(item.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all
                  ${checked ? 'border-fresh-200 bg-fresh-50 opacity-60' : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {checked ? <CheckSquare size={18} className="text-fresh-500" /> : <Square size={18} className="text-stone-300" />}
                </div>
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-50 flex-shrink-0 border border-stone-200">
                  <ProductImage storageKey={item.product?.main_image?.storage_key} alt={item.product?.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${checked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                    {item.product?.name ?? `Product #${item.product_id}`}
                  </p>
                  <p className="text-stone-400 text-xs">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold text-stone-700 text-sm flex-shrink-0">
                  {formatPrice((item.unit_amount ?? 0) * item.quantity)}
                </p>
              </button>
            )
          })}
        </div>

        <div className="border-t-2 border-stone-100 mt-4 pt-4 flex justify-between items-center">
          <span className="font-display text-lg text-stone-700">Order Total</span>
          <span className="font-display text-2xl text-brand-600">{formatPrice(order.total_amount)}</span>
        </div>
      </div>

      {order.payment_status && (
        <div className={`rounded-2xl border-2 px-5 py-4 flex items-center gap-3
          ${order.payment_status === 'paid' ? 'bg-fresh-50 border-fresh-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className="text-xl">{order.payment_status === 'paid' ? '✅' : '💳'}</span>
          <div>
            <p className={`text-sm font-bold ${order.payment_status === 'paid' ? 'text-fresh-700' : 'text-amber-700'}`}>
              Payment {capitalize(order.payment_status)}
            </p>
            {order.payment_status !== 'paid' && (
              <p className="text-xs text-amber-500">Collect payment upon delivery</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}