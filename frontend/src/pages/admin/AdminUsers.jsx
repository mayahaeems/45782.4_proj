import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Search, Pencil, Trash2, UserPlus, Shield, Truck, ShoppingBag,
  Mail, Phone, MapPin, Lock, AlertTriangle, Info
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usersApi } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { formatDate, capitalize } from '@/utils/format'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ── Constants ──────────────────────────────────────────────────────────────────

const roleVariant = (role) => ({ admin: 'red', delivery: 'blue', user: 'green' }[role] ?? 'gray')
const ROLE_ICONS  = { admin: Shield, delivery: Truck, user: ShoppingBag }
const ROLES       = ['user', 'delivery', 'admin']

// ── Schemas ────────────────────────────────────────────────────────────────────

const editSchema = z.object({
  full_name:       z.string().min(2, 'Required'),
  new_password:    z.string().optional(),
  default_phone:   z.string().min(7, 'Required'),
  default_address: z.string().optional(),
  role:            z.enum(['user', 'delivery', 'admin']),
})

const createSchema = z.object({
  full_name:       z.string().min(2, 'Required'),
  email:           z.string().email('Valid email required'),
  default_phone:   z.string().min(7, 'Required'),
  default_address: z.string().optional(),
  password:        z.string().min(8, 'At least 8 characters'),
  role:            z.enum(['user', 'delivery', 'admin']),
})

// ── Role Selector ──────────────────────────────────────────────────────────────

function RoleSelector({ value, onChange, disabled = false, disabledReason = '' }) {
  return (
    <div>
      <p className="text-sm font-bold text-stone-700 mb-2">Role</p>
      {disabledReason && (
        <div className="flex items-start gap-2 mb-2 p-2 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{disabledReason}</p>
        </div>
      )}
      <div className="flex gap-2">
        {ROLES.map((r) => {
          const Icon = ROLE_ICONS[r]
          const isSelected = value === r
          const isDisabled = disabled

          return (
            <button
              type="button"
              key={r}
              onClick={() => !isDisabled && onChange(r)}
              disabled={isDisabled}
              title={isDisabled ? disabledReason : `Set role to ${r}`}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold
                          transition-all select-none
                ${isDisabled
                  ? 'opacity-40 cursor-not-allowed bg-stone-50 border-stone-200 text-stone-400'
                  : isSelected
                    ? r === 'admin'    ? 'bg-red-500 text-white border-red-600'
                      : r === 'delivery' ? 'bg-ocean-500 text-white border-ocean-600'
                      : 'bg-fresh-500 text-white border-fresh-600'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
            >
              <Icon size={16} />
              {capitalize(r)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Edit User Form ─────────────────────────────────────────────────────────────

function EditUserForm({ user, currentAdminId, onSubmit, loading }) {
  // Admins cannot change another admin's role (backend enforces this too)
  const [showPasswordField, setShowPasswordField] = useState(false)
  const isTargetAdmin  = user.role === 'admin'
  const roleDisabled   = isTargetAdmin
  const roleDisabledMsg = isTargetAdmin
    ? "Admin role cannot be changed here. Direct database access is required to demote an admin account."
    : ''

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      full_name:       user.full_name ?? '',
      default_phone:   user.default_phone ?? '',
      default_address: user.default_address ?? '',
      role:            user.role ?? 'user',
    },
  })

  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Full Name"       error={errors.full_name?.message}       {...register('full_name')} />
      <Input label="Phone"           error={errors.default_phone?.message}   {...register('default_phone')} />
      <Input label="Default Address" error={errors.default_address?.message} {...register('default_address')} />

      <RoleSelector
        value={role}
        onChange={(r) => setValue('role', r)}
        disabled={roleDisabled}
        disabledReason={roleDisabledMsg}
      />

      <div className="flex flex-col gap-2">
        {!showPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPasswordField(true)}
            className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 px-3 py-2 rounded-xl border-2 border-brand-200 hover:bg-brand-50 transition-colors w-fit"
          >
            🔑 Set New Password
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password (min 8 chars)"
              error={errors.new_password?.message}
              {...register('new_password')}
            />
            <button
              type="button"
              onClick={() => setShowPasswordField(false)}
              className="text-xs text-stone-400 hover:text-stone-600 text-left"
            >
              Cancel password change
            </button>
          </div>
        )}
      </div>

      <Button type="submit" loading={loading}>Save Changes</Button>
    </form>
  )
}

// ── Create User Form ──────────────────────────────────────────────────────────

function CreateUserForm({ onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'user' },
  })

  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Full Name"   error={errors.full_name?.message}     {...register('full_name')} />
      <Input label="Email"       type="email" error={errors.email?.message} {...register('email')} />
      <Input label="Phone"       error={errors.default_phone?.message} {...register('default_phone')} />
      <Input label="Address"     error={errors.default_address?.message} {...register('default_address')} />
      <Input label="Password"    type="password" error={errors.password?.message} {...register('password')} />

      <RoleSelector value={role} onChange={(r) => setValue('role', r)} />

      <Button type="submit" loading={loading}>Create User</Button>
    </form>
  )
}

// ── Stats Strip ────────────────────────────────────────────────────────────────

function RoleStats({ users }) {
  const counts = {
    admin:    users.filter((u) => u.role === 'admin').length,
    delivery: users.filter((u) => u.role === 'delivery').length,
    user:     users.filter((u) => u.role === 'user').length,
  }
  const cards = [
    { role: 'admin',    Icon: Shield,      color: 'red',   label: 'Admins' },
    { role: 'delivery', Icon: Truck,       color: 'ocean', label: 'Delivery' },
    { role: 'user',     Icon: ShoppingBag, color: 'fresh', label: 'Customers' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ role, Icon, color, label }) => (
        <div key={role} className={`bg-${color}-50 rounded-2xl p-4 border border-${color}-100`}>
          <div className="flex items-center gap-2 mb-1">
            <Icon size={14} className={`text-${color}-500`} />
            <span className={`text-xs font-bold text-${color}-600`}>{label}</span>
          </div>
          <p className={`text-2xl font-display text-${color}-700`}>{counts[role]}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const currentAdmin = useAuthStore((s) => s.user)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCreate, setShowCreate]   = useState(false)
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  })

  const createUser = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created! 🎉')
      setShowCreate(false)
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Create failed'),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated!')
      setEditTarget(null)
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  })

  const deleteUser = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
      setDeleteTarget(null)
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Delete failed'),
  })

  const filtered = users.filter((u) => {
    const matchSearch = !search
      || u.full_name?.toLowerCase().includes(search.toLowerCase())
      || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  // Whether admin can edit/delete a given user
  const canEdit   = (u) => u.id !== currentAdmin?.id  // can't edit self here (use profile)
  const canDelete = (u) =>
    u.id !== currentAdmin?.id &&  // can't delete self
    u.role !== 'admin'             // can't delete other admins

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-stone-800">Users 👥</h1>
          <p className="text-stone-400 text-sm mt-0.5">{users.length} total users</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      <RoleStats users={users} />

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'user', 'delivery', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                ${roleFilter === r
                  ? 'bg-brand-500 text-white border-brand-600'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                }`}
            >
              {r === 'all' ? 'All' : capitalize(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-stone-100 bg-stone-50">
              <th className="text-left p-4 font-bold text-stone-600">User</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden sm:table-cell">Email</th>
              <th className="text-left p-4 font-bold text-stone-600">Role</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden md:table-cell">Phone</th>
              <th className="text-left p-4 font-bold text-stone-600 hidden lg:table-cell">Joined</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const RoleIcon = ROLE_ICONS[user.role] ?? ShoppingBag
              const isSelf   = user.id === currentAdmin?.id
              const isAdmin  = user.role === 'admin'

              return (
                <tr
                  key={user.id}
                  className={`border-b border-stone-100 transition-colors
                    ${isSelf ? 'bg-brand-50/40' : 'hover:bg-stone-50'}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center
                                       font-bold text-sm flex-shrink-0
                        ${isAdmin ? 'bg-red-100 text-red-600'
                          : user.role === 'delivery' ? 'bg-ocean-100 text-ocean-600'
                          : 'bg-brand-100 text-brand-600'}`}>
                        {user.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-stone-800 block">
                          {user.full_name}
                          {isSelf && (
                            <span className="ml-2 text-[10px] font-bold text-brand-500 bg-brand-50
                                             px-2 py-0.5 rounded-full border border-brand-200">
                              You
                            </span>
                          )}
                        </span>
                        {user.default_address && (
                          <span className="text-stone-400 text-xs line-clamp-1 max-w-[160px]">
                            {user.default_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-stone-500 hidden sm:table-cell">{user.email}</td>
                  <td className="p-4">
                    <Badge variant={roleVariant(user.role)}>
                      <RoleIcon size={11} className="inline mr-1" />
                      {capitalize(user.role)}
                    </Badge>
                    {isAdmin && !isSelf && (
                      <span className="ml-1.5 text-[10px] text-stone-400" title="Admin role is protected">🔒</span>
                    )}
                  </td>
                  <td className="p-4 text-stone-500 hidden md:table-cell">
                    {user.default_phone ?? '—'}
                  </td>
                  <td className="p-4 text-stone-400 hidden lg:table-cell text-xs">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Edit — blocked for self (use /profile), allowed for anyone else */}
                      {canEdit(user) ? (
                        <button
                          onClick={() => setEditTarget(user)}
                          className="p-2 hover:bg-brand-50 hover:text-brand-500 rounded-xl transition-colors"
                          title="Edit user"
                        >
                          <Pencil size={14} />
                        </button>
                      ) : (
                        <span
                          className="p-2 text-stone-200 cursor-not-allowed rounded-xl"
                          title="Use your profile page to edit your own account"
                        >
                          <Pencil size={14} />
                        </span>
                      )}

                      {/* Delete — blocked for self and other admins */}
                      {canDelete(user) ? (
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span
                          className="p-2 text-stone-200 cursor-not-allowed rounded-xl"
                          title={isSelf ? 'Cannot delete yourself' : 'Cannot delete admin accounts'}
                        >
                          <Trash2 size={14} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-stone-400">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New User"
        size="sm"
      >
        <CreateUserForm
          loading={createUser.isPending}
          onSubmit={(data) => createUser.mutate(data)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit: ${editTarget?.full_name}`}
        size="sm"
      >
        {editTarget && (
          <EditUserForm
            user={editTarget}
            currentAdminId={currentAdmin?.id}
            loading={updateUser.isPending}
            onSubmit={(data) => {
              const payload = { ...data }
              if (payload.new_password) {
                payload.password = payload.new_password
              }
              delete payload.new_password
              updateUser.mutate({ id: editTarget.id, data: payload })
            }}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteUser.mutate(deleteTarget.id)}
        loading={deleteUser.isPending}
        title="Delete User?"
        message={`Permanently delete "${deleteTarget?.full_name}"? This cannot be undone.`}
      />
    </div>
  )
}