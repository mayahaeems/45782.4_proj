import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Tag, ChevronDown, ChevronUp, Search } from 'lucide-react'
import client from '@/api/client'
import { formatDate, capitalize } from '@/utils/format'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

const fetchInventoryLogs = () =>
  client.get('/inventory-logs/').then((r) => r.data)

const fetchCategoryLogs = () =>
  client.get('/category-logs/').then((r) => r.data)

const INVENTORY_COLORS = {
  restock:      'bg-fresh-100 text-fresh-700',
  adjustment:   'bg-amber-100 text-amber-700',
  price_change: 'bg-ocean-100 text-ocean-700',
  activated:    'bg-brand-100 text-brand-600',
  deactivated:  'bg-stone-100 text-stone-600',
  name_change:  'bg-berry-100 text-berry-700',
  description:  'bg-purple-100 text-purple-700',
}

const CATEGORY_COLORS = {
  created:         'bg-fresh-100 text-fresh-700',
  name_change:     'bg-ocean-100 text-ocean-700',
  description:     'bg-purple-100 text-purple-700',
  image_change:    'bg-amber-100 text-amber-700',
  deleted:         'bg-red-100 text-red-700',
  product_added:   'bg-brand-100 text-brand-600',
  product_removed: 'bg-stone-100 text-stone-600',
}

function ChangeBadge({ type, colorMap }) {
  const cls = colorMap[type] ?? 'bg-stone-100 text-stone-600'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>
      {capitalize(type?.replace(/_/g, ' '))}
    </span>
  )
}

function LogRow({ log, colorMap, nameKey }) {
  const [open, setOpen] = useState(false)
  const hasDetails = log.old_value || log.new_value || log.note

  return (
    <>
      <tr
        className={`border-b border-stone-50 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-stone-50' : ''}`}
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        <td className="px-5 py-3 font-bold text-stone-500 text-xs">#{log.id}</td>
        <td className="px-5 py-3 text-stone-700 font-semibold text-sm">
          {log[nameKey] ?? <span className="text-stone-400 italic">—</span>}
        </td>
        <td className="px-5 py-3">
          <ChangeBadge type={log.change_type} colorMap={colorMap} />
        </td>
        <td className="px-5 py-3 text-stone-500 text-xs hidden md:table-cell">
          {log.admin?.full_name ?? <span className="italic">unknown</span>}
        </td>
        <td className="px-5 py-3 text-stone-400 text-xs hidden sm:table-cell">
          {formatDate(log.created_at)}
        </td>
        <td className="px-5 py-3 text-stone-400">
          {hasDetails && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
        </td>
      </tr>

      {open && hasDetails && (
        <tr className="bg-stone-50 border-b border-stone-100">
          <td colSpan={6} className="px-5 py-3">
            <div className="flex flex-wrap gap-6 text-xs text-stone-600">
              {log.old_value && (
                <div>
                  <span className="font-bold text-stone-400 uppercase tracking-wide block mb-0.5">Before</span>
                  <span className="font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded">{log.old_value}</span>
                </div>
              )}
              {log.new_value && (
                <div>
                  <span className="font-bold text-stone-400 uppercase tracking-wide block mb-0.5">After</span>
                  <span className="font-mono bg-fresh-50 text-fresh-700 px-2 py-0.5 rounded">{log.new_value}</span>
                </div>
              )}
              {log.note && (
                <div>
                  <span className="font-bold text-stone-400 uppercase tracking-wide block mb-0.5">Note</span>
                  <span className="italic text-stone-500">{log.note}</span>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function LogTable({ logs, colorMap, nameKey, nameLabel, search }) {
  const filtered = logs.filter((l) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      l[nameKey]?.toLowerCase().includes(s) ||
      l.change_type?.toLowerCase().includes(s) ||
      l.admin?.full_name?.toLowerCase().includes(s) ||
      l.note?.toLowerCase().includes(s)
    )
  })

  if (filtered.length === 0) {
    return (
      <EmptyState
        emoji="📋"
        title="No logs found"
        message={search ? 'Try a different search term.' : 'No activity recorded yet.'}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100 bg-stone-50/60">
            <th className="text-left px-5 py-3 font-bold text-stone-400 text-xs uppercase tracking-wide">#</th>
            <th className="text-left px-5 py-3 font-bold text-stone-400 text-xs uppercase tracking-wide">{nameLabel}</th>
            <th className="text-left px-5 py-3 font-bold text-stone-400 text-xs uppercase tracking-wide">Change</th>
            <th className="text-left px-5 py-3 font-bold text-stone-400 text-xs uppercase tracking-wide hidden md:table-cell">Admin</th>
            <th className="text-left px-5 py-3 font-bold text-stone-400 text-xs uppercase tracking-wide hidden sm:table-cell">Date</th>
            <th className="px-5 py-3 w-6" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((log) => (
            <LogRow key={log.id} log={log} colorMap={colorMap} nameKey={nameKey} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  { id: 'inventory', label: 'Inventory Logs', icon: Package },
  { id: 'category',  label: 'Category Logs',  icon: Tag },
]

export default function AdminLogs() {
  const [tab, setTab] = useState('inventory')
  const [search, setSearch] = useState('')

  const { data: inventoryLogs = [], isLoading: loadingInv } = useQuery({
    queryKey: ['inventory-logs'],
    queryFn: fetchInventoryLogs,
  })

  const { data: categoryLogs = [], isLoading: loadingCat } = useQuery({
    queryKey: ['category-logs'],
    queryFn: fetchCategoryLogs,
  })

  const isLoading = loadingInv || loadingCat

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-display text-stone-800">Logs 📋</h1>
        <p className="text-stone-400 font-body mt-1">Audit trail of all admin changes.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <Package size={18} className="text-brand-500" />
          </div>
          <div>
            <p className="text-2xl font-display text-stone-800">{inventoryLogs.length}</p>
            <p className="text-xs font-semibold text-stone-400">Inventory changes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-stone-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fresh-100 flex items-center justify-center">
            <Tag size={18} className="text-fresh-600" />
          </div>
          <div>
            <p className="text-2xl font-display text-stone-800">{categoryLogs.length}</p>
            <p className="text-xs font-semibold text-stone-400">Category changes</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 pb-0 border-b border-stone-100 flex-wrap">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setTab(id); setSearch('') }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors
                  ${tab === id
                    ? 'bg-brand-500 text-white'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="relative mb-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs…"
              className="pl-8 pr-3 py-1.5 text-sm border-2 border-stone-200 rounded-xl
                         focus:outline-none focus:border-brand-400 w-48"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : tab === 'inventory' ? (
          <LogTable
            logs={inventoryLogs}
            colorMap={INVENTORY_COLORS}
            nameKey="product_name"
            nameLabel="Product"
            search={search}
          />
        ) : (
          <LogTable
            logs={categoryLogs}
            colorMap={CATEGORY_COLORS}
            nameKey="category_name"
            nameLabel="Category"
            search={search}
          />
        )}
      </div>
    </div>
  )
}