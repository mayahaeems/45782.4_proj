import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Package } from 'lucide-react'
import { useOrder, useCancelOrder } from '@/hooks/useOrders'
import { formatPrice, formatDateTime, capitalize } from '@/utils/format'
import Badge, { statusVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ProductImage from '@/components/ui/ProductImage'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const DELIVERY_STEPS = ['pending', 'processing', 'assigned', 'on_the_way', 'delivered']

const STEP_LABELS = {
  pending:    { label: 'Order Placed',   emoji: '📋' },
  processing: { label: 'Processing',     emoji: '⚙️' },
  assigned:   { label: 'Assigned',       emoji: '📦' },
  on_the_way: { label: 'On the Way',     emoji: '🚚' },
  delivered:  { label: 'Delivered',      emoji: '✅' },
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const { mutate: cancel, isPending: cancelling } = useCancelOrder()
  const [confirmCancel, setConfirmCancel] = useState(false)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!order) return <p className="text-center py-20 text-stone-500">Order not found</p>

  const stepIdx  = DELIVERY_STEPS.indexOf(order.delivery_status)
  const canCancel = ['pending', 'processing'].includes(order.delivery_status)
  const isCanceled = order.delivery_status === 'canceled'

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <Link to="/orders" className="btn-ghost flex items-center gap-2 w-fit">
        <ArrowLeft size={16} /> Back to orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-2xl font-display text-stone-800">Order #{order.id}</h1>
            <p className="text-stone-400 text-sm mt-0.5">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Badge variant={statusVariant(order.delivery_status)}>
              {capitalize(order.delivery_status?.replace('_', ' '))}
            </Badge>
            <Badge variant={statusVariant(order.payment_status)}>
              {capitalize(order.payment_status)}
            </Badge>
          </div>
        </div>

        {/* Progress tracker */}
        {!isCanceled && (
          <div className="mt-6">
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-stone-100 rounded-full">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{ width: stepIdx >= 0 ? `${(stepIdx / (DELIVERY_STEPS.length - 1)) * 100}%` : '0%' }}
                />
              </div>

              <div className="relative flex justify-between">
                {DELIVERY_STEPS.map((step, i) => {
                  const done   = i < stepIdx
                  const active = i === stepIdx
                  const info   = STEP_LABELS[step]
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
                                       text-sm font-bold z-10 bg-white transition-all
                        ${done   ? 'bg-brand-500 border-brand-600 text-white'
                          : active ? 'border-brand-500 text-brand-600 shadow-fun-brand'
                          : 'border-stone-200 text-stone-400'
                        }`}>
                        {done ? '✓' : info.emoji}
                      </div>
                      <span className={`text-[10px] font-bold hidden sm:block text-center max-w-[60px]
                        ${active ? 'text-brand-600' : done ? 'text-stone-600' : 'text-stone-300'}`}>
                        {info.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {isCanceled && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-center">
            <span className="text-red-600 font-bold text-sm">❌ This order has been canceled</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <Package size={20} className="text-brand-500" /> Items
        </h2>
        <div className="flex flex-col gap-3">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50 border border-stone-100">
                <ProductImage
                  storageKey={item.product?.main_image?.storage_key}
                  alt={item.product?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-stone-800 text-sm">
                  {item.product?.name ?? `Product #${item.product_id}`}
                </p>
                <p className="text-stone-400 text-xs">
                  {formatPrice(item.unit_amount)} × {item.quantity}
                </p>
              </div>
              <p className="font-bold text-stone-800">
                {formatPrice((item.unit_amount ?? 0) * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-stone-100 mt-4 pt-4 space-y-1.5">
          {order.shipping_amount > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>Shipping</span>
              <span>{formatPrice(order.shipping_amount)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-fresh-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="font-display text-lg">Total</span>
            <span className="font-display text-xl text-brand-600">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
        <h2 className="font-display text-xl mb-4">Delivery Info</h2>
        <div className="flex flex-col gap-3 text-sm">
          {order.address && (
            <div className="flex items-start gap-2 text-stone-600">
              <MapPin size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
              <span>{order.address}</span>
            </div>
          )}
          {order.phone_number && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-brand-500 flex-shrink-0" />
              <a href={`tel:${order.phone_number}`} className="text-stone-600 hover:underline">
                {order.phone_number}
              </a>
            </div>
          )}
          {order.delivery_user && (
            <div className="flex items-center gap-2 mt-1 p-3 bg-ocean-50 rounded-xl border border-ocean-200">
              <span className="text-lg">🚚</span>
              <div>
                <p className="text-xs font-bold text-ocean-600">Your delivery person</p>
                <p className="font-semibold text-stone-800 text-sm">{order.delivery_user.full_name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel button */}
      {canCancel && (
        <div>
          <Button variant="danger" onClick={() => setConfirmCancel(true)}>
            Cancel Order
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => { cancel(id); setConfirmCancel(false) }}
        loading={cancelling}
        title="Cancel Order?"
        message="Are you sure you want to cancel this order? This cannot be undone."
      />
    </div>
  )
}