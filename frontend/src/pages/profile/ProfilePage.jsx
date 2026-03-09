import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Phone, Mail, Lock, Trash2, Save, ShoppingBag, Package } from 'lucide-react'
import client from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useOrders } from '@/hooks/useOrders'
import { formatPrice, formatDate, capitalize } from '@/utils/format'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import Badge, { statusVariant } from '@/components/ui/Badge'

const profileSchema = z.object({
  full_name:       z.string().min(2, 'At least 2 characters'),
  default_phone:   z.string().min(7, 'Valid phone required').optional().or(z.literal('')),
  default_address: z.string().optional(),
})

const passwordSchema = z.object({
  password:        z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

function ProfileForm({ user }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const token   = useAuthStore((s) => s.token)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name:       user?.full_name ?? '',
      default_phone:   user?.default_phone ?? '',
      default_address: user?.default_address ?? '',
    },
  })

  const update = useMutation({
    mutationFn: (data) => client.put('/users/me', data),
    onSuccess: (res) => { setAuth(res.data, token); toast.success('Profile updated! ✅') },
    onError:   (e)   => toast.error(e?.response?.data?.message ?? 'Update failed'),
  })

  return (
    <form onSubmit={handleSubmit((d) => update.mutate(d))} className="flex flex-col gap-4">
      <Input label="Full Name" icon={<User size={15} />} error={errors.full_name?.message} {...register('full_name')} />
      <Input label="Phone"     icon={<Phone size={15} />} error={errors.default_phone?.message} {...register('default_phone')} />
      <div>
        <label className="block text-sm font-bold text-stone-700 mb-1">Default Address</label>
        <textarea {...register('default_address')} rows={2} className="input resize-none text-sm" placeholder="Your delivery address" />
      </div>
      <Button type="submit" loading={update.isPending} disabled={!isDirty} className="flex items-center gap-2 w-fit">
        <Save size={15} /> Save Changes
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
  })
  const update = useMutation({
    mutationFn: ({ password }) => client.put('/users/me', { password }),
    onSuccess: () => { toast.success('Password updated! 🔒'); reset() },
    onError:   () => toast.error('Failed to update password'),
  })
  return (
    <form onSubmit={handleSubmit((d) => update.mutate(d))} className="flex flex-col gap-4">
      <Input label="New Password"     type="password" icon={<Lock size={15} />} error={errors.password?.message}        {...register('password')} />
      <Input label="Confirm Password" type="password" icon={<Lock size={15} />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <Button type="submit" loading={update.isPending} className="flex items-center gap-2 w-fit">
        <Lock size={15} /> Update Password
      </Button>
    </form>
  )
}

function RecentOrders() {
  const { data: orders = [], isLoading } = useOrders()
  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>
  if (!orders.length) return (
    <div className="text-center py-8 text-stone-400">
      <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
      <p className="text-sm font-semibold mb-1">No orders yet</p>
      <Link to="/" className="text-brand-500 text-sm font-bold hover:underline">Start shopping →</Link>
    </div>
  )
  return (
    <div className="flex flex-col gap-2">
      {orders.slice(0, 5).map((order) => (
        <Link key={order.id} to={`/orders/${order.id}`}
          className="flex items-center gap-3 p-3 rounded-2xl border-2 border-transparent
                     hover:border-brand-200 hover:bg-brand-50 transition-all">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 text-sm">Order #{order.id}</p>
            <p className="text-stone-400 text-xs">{formatDate(order.created_at)}</p>
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            <p className="font-display text-brand-600 text-sm">{formatPrice(order.total_amount)}</p>
            <Badge variant={statusVariant(order.delivery_status)}>
              {capitalize(order.delivery_status?.replace('_', ' '))}
            </Badge>
          </div>
        </Link>
      ))}
      {orders.length > 5 && (
        <Link to="/orders" className="text-center text-brand-500 text-sm font-bold hover:underline py-2">
          See all {orders.length} orders →
        </Link>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const user      = useAuthStore((s) => s.user)
  const logout    = useAuthStore((s) => s.logout)
  const resetCart = useCartStore((s) => s.reset)
  const navigate  = useNavigate()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await client.delete('/users/me')
      logout(); resetCart()
      toast.success('Account deleted')
      navigate('/')
    } catch {
      toast.error('Could not delete account')
    } finally {
      setDeleting(false); setDeleteConfirm(false)
    }
  }

  if (!user) return null

  const roleLabel = { user: 'Customer', delivery: 'Delivery Driver', admin: 'Administrator' }[user.role] ?? user.role

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-12">

      {/* Banner */}
      <div className="bg-gradient-to-br from-brand-500 to-orange-400 rounded-3xl p-8 text-white
                      border-2 border-brand-600 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-8xl opacity-10 select-none rotate-12">👤</div>
        <div className="flex items-center gap-5 relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center
                          text-3xl font-bold flex-shrink-0 border-2 border-white/30">
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-display">{user.full_name}</h1>
            <p className="text-orange-100 text-sm mt-0.5 flex items-center gap-1.5">
              <Mail size={13} /> {user.email}
            </p>
            {user.default_phone && (
              <p className="text-orange-100 text-sm flex items-center gap-1.5 mt-0.5">
                <Phone size={13} /> {user.default_phone}
              </p>
            )}
            <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full bg-white/20">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Edit & password */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
          <h2 className="font-display text-xl mb-5 flex items-center gap-2">
            <User size={18} className="text-brand-500" /> Edit Profile
          </h2>
          <ProfileForm user={user} />
        </div>
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
          <h2 className="font-display text-xl mb-5 flex items-center gap-2">
            <Lock size={18} className="text-brand-500" /> Change Password
          </h2>
          <PasswordForm />
        </div>
      </div>

      {/* Recent orders — regular users only */}
      {user.role === 'user' && (
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-500" /> Recent Orders
            </h2>
            <Link to="/orders" className="text-sm font-bold text-brand-500 hover:underline">View all →</Link>
          </div>
          <RecentOrders />
        </div>
      )}

      {/* Danger zone */}
      <div className="bg-white rounded-3xl border-2 border-red-200 p-6">
        <h2 className="font-display text-xl text-red-600 mb-2 flex items-center gap-2">
          <Trash2 size={18} /> Danger Zone
        </h2>
        <p className="text-stone-500 text-sm mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <Button variant="danger" onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2">
          <Trash2 size={15} /> Delete My Account
        </Button>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Your Account?"
        message="Permanently deletes your account and all order history. There's no going back."
      />
    </div>
  )
}