import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import CartMergeDialog from './Cartmergedialog'
import { useCart } from '@/hooks/useCart'

// Mounts cart sync logic (badge + merge detection) AND provides serverCart to merge dialog
function CartSyncAndMerge() {
  const { data: serverCart } = useCart()
  return <CartMergeDialog serverCart={serverCart} />
}

export default function ShopLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-amber-50">
      <CartSyncAndMerge />
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t-2 border-stone-100 bg-white py-6 text-center text-stone-400 font-body text-sm">
        🛒 SuperMart — Fresh groceries delivered to your door
      </footer>
    </div>
  )
}
