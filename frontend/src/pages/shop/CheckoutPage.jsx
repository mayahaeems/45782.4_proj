import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { MapPin, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCart } from '@/hooks/useCart'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useState } from 'react'
import { ordersApi } from '@/api/orders'
import { useQueryClient } from '@tanstack/react-query'
import { useCartStore } from '@/store/cartStore'

const schema = z.object({
  address:          z.string().min(5, 'Enter a delivery address'),
  phone_number:     z.string().min(7, 'Enter a valid phone number'),
  payment_provider: z.enum(['card', 'paypal']),
})

export default function CheckoutPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: cart, isLoading } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const qc = useQueryClient()
  const clearGuestItems = useCartStore((s) => s.clearGuestItems)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      address:          user?.default_address ?? '',
      phone_number:     user?.default_phone ?? '',
      payment_provider: 'card',
    },
  })

  const selectedPayment = watch('payment_provider')
  const items = cart?.items ?? []
  const total = items.reduce((sum, i) => sum + (i.unit_amount ?? i.product?.price_amount ?? 0) * i.quantity, 0)

  const doSubmit = async () => {
    const data = {
      address: (document.getElementById('checkout-address')?.value || '').trim(),
      phone_number: (document.getElementById('checkout-phone')?.value || '').trim(),
      payment_provider: selectedPayment || 'card',
    }

    if (data.address.length < 5) { toast.error('Enter a valid delivery address'); return }
    if (data.phone_number.length < 7) { toast.error('Enter a valid phone number'); return }
    if (items.length === 0) { toast.error('Your cart is empty'); return }

    setSubmitting(true)
    try {
      const orderRes = await ordersApi.create(data)
      clearGuestItems()
      qc.invalidateQueries({ queryKey: ['cart'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      navigate('/checkout/success', { state: { orderId: orderRes.data.id } })
    } catch (e) {
      console.error('Checkout error:', e.response?.data)
      const errData = e.response?.data
      if (errData?.details?.cart_items) {
        const msgs = Object.values(errData.details.cart_items).join(', ')
        toast.error(msgs, { duration: 5000 })
        qc.invalidateQueries({ queryKey: ['cart'] })
      } else {
        toast.error(errData?.error || errData?.message || 'Checkout failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="section-title mb-8">Checkout 🏁</h1>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Form — no <form> tag to avoid submit issues */}
        <div className="md:col-span-3 flex flex-col gap-6">

          {/* Delivery details */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <MapPin className="text-brand-500" size={20} /> Delivery Details
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-700">Delivery Address</label>
                <input
                  id="checkout-address"
                  defaultValue={user?.default_address ?? ''}
                  placeholder="123 Herzl St, Tel Aviv"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 focus:border-brand-400 focus:outline-none transition-colors text-stone-800"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-stone-700">Phone Number</label>
                <input
                  id="checkout-phone"
                  defaultValue={user?.default_phone ?? ''}
                  placeholder="050-1234567"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 focus:border-brand-400 focus:outline-none transition-colors text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <CreditCard className="text-brand-500" size={20} /> Payment Method
            </h2>
            <div className="flex gap-3">
              {[
                { value: 'card',   label: 'Credit Card', emoji: '💳' },
                { value: 'paypal', label: 'PayPal',       emoji: '🅿️' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue('payment_provider', opt.value)}
                  className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer
                    transition-all duration-150 text-left
                    ${selectedPayment === opt.value
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-stone-200 hover:border-stone-300'
                    }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="font-bold text-stone-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={doSubmit}
            loading={submitting}
            size="lg"
            className="w-full justify-center"
          >
            Place Order 🎉
          </Button>
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6 sticky top-24">
            <h2 className="font-display text-xl mb-4">Order Summary</h2>
            <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
              {items.map((item, i) => (
                <div key={item.id ?? item.product_id ?? i} className="flex justify-between text-sm">
                  <span className="text-stone-600 truncate mr-2">
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="font-semibold text-stone-800 whitespace-nowrap">
                    {formatPrice((item.unit_amount ?? item.product?.price_amount ?? 0) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-stone-100 pt-4 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm text-stone-500">
                <span>Delivery</span>
                <span className="text-fresh-600 font-bold">FREE</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-display text-lg">Total</span>
                <span className="font-display text-xl text-brand-600">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
