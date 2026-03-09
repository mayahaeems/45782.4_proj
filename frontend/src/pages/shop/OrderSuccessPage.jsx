import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function OrderSuccessPage() {
  const { state } = useLocation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="text-8xl animate-bounce">🎉</div>
      <div className="bg-fresh-100 rounded-full p-4">
        <CheckCircle2 className="text-fresh-600" size={40} />
      </div>
      <div>
        <h1 className="text-4xl font-display text-stone-800 mb-2">Order Placed!</h1>
        <p className="text-stone-500 font-body">
          Your groceries are on their way. We'll keep you updated!
        </p>
        {state?.orderId && (
          <p className="text-sm text-stone-400 mt-1">Order #{state.orderId}</p>
        )}
      </div>
      <div className="flex gap-4">
        <Link to="/orders">
          <Button variant="secondary">View My Orders</Button>
        </Link>
        <Link to="/">
          <Button>Keep Shopping 🛒</Button>
        </Link>
      </div>
    </div>
  )
}
