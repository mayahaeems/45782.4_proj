import { useState } from 'react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import ProductCard from '@/components/shop/ProductCard'
import CategoryPill from '@/components/shop/CategoryPill'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

export default function CatalogPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', { search, category_id: categoryId }],
    queryFn: () => productsApi.list({
      ...(search && { search }),
      ...(categoryId && { category_id: categoryId }),
    }).then((r) => r.data),
  })

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-500 to-orange-400 rounded-3xl p-8 text-white
                      border-2 border-brand-600 shadow-fun-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 text-9xl opacity-20 rotate-12 select-none">🛒</div>
        <div className="relative">
          <h1 className="text-4xl font-display mb-1">Fresh & Tasty! 🍊</h1>
          <p className="text-orange-100 font-body">
            {products.length} products ready to deliver to your door
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input pl-12 text-base"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <CategoryPill
          category={{ name: 'All' }}
          active={!categoryId}
          onClick={() => setCategoryId(null)}
        />
        {categories.map((cat) => (
          <CategoryPill
            key={cat.id}
            category={cat}
            active={categoryId === cat.id}
            onClick={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
          />
        ))}
      </div>

      {/* Products grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="Nothing found"
          message="Try a different search or category"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
