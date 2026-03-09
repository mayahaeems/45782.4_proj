import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Search, Upload, X, Star, Image as ImageIcon, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts'
import { categoriesApi } from '@/api/categories'
import { filesApi } from '@/api/files'
import { productsApi } from '@/api/products'
import { formatPrice } from '@/utils/format'
import ProductImage from '@/components/ui/ProductImage'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'

const schema = z.object({
  name:         z.string().min(1, 'Required'),
  description:  z.string().optional(),
  price_amount: z.coerce.number().min(1, 'Price must be > 0'),
  quantity:     z.coerce.number().min(0),
  category_ids: z.array(z.coerce.number()).min(1, 'Select at least one category'),
  is_active:    z.boolean().optional(),
})

// ── Image Uploader ─────────────────────────────────────────────────────────────
function ImageUploader({ productId, images = [], mainImageId, onUploaded, onSetMain, onDeleted }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleFiles = async (files) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const res = await filesApi.upload(file, 'products')
        onUploaded?.(res.data.storage_key)
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
        <ImageIcon size={14} /> Product Images
      </p>

      {/* Existing images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((img) => (
            <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border-2
                                          border-stone-200 flex-shrink-0">
              <ProductImage storageKey={img.storage_key} alt="" className="w-full h-full object-cover" />

              {/* Main badge */}
              {img.id === mainImageId && (
                <div className="absolute top-1 left-1 bg-brand-500 text-white rounded-md px-1 py-0.5 text-[9px] font-bold">
                  MAIN
                </div>
              )}

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center gap-1">
                {img.id !== mainImageId && (
                  <button
                    type="button"
                    onClick={() => onSetMain?.(img.id)}
                    title="Set as main"
                    className="bg-white/90 hover:bg-white rounded-lg p-1.5 transition-colors"
                  >
                    <Star size={12} className="text-amber-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDeleted?.(img)}
                  title="Delete"
                  className="bg-white/90 hover:bg-white rounded-lg p-1.5 transition-colors"
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
                   border-stone-300 hover:border-brand-400 hover:bg-brand-50 transition-colors
                   text-sm font-semibold text-stone-500 hover:text-brand-500 w-full justify-center"
      >
        {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
        {uploading ? 'Uploading...' : 'Upload Images'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ── Product Form ───────────────────────────────────────────────────────────────
function ProductForm({ defaultValues, onSubmit, loading, categories }) {
  const qc = useQueryClient()
  const [pendingImages, setPendingImages] = useState([])
  const [localMainId, setLocalMainId] = useState(defaultValues?.main_image_id ?? null)
  const [deleteImageTarget, setDeleteImageTarget] = useState(null)
  const [deletingImage, setDeletingImage] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         defaultValues?.name        ?? '',
      description:  defaultValues?.description ?? '',
      quantity:     defaultValues?.quantity     ?? 0,
      is_active:    defaultValues?.is_active    ?? true,
      price_amount: defaultValues?.price_amount
        ? (defaultValues.price_amount / 100).toFixed(2)
        : '',
      category_ids: defaultValues?.categories?.map((c) => c.id) ?? [],
    },
  })

  const selectedCats = watch('category_ids') ?? []
  const isActive = watch('is_active')

  const toggleCat = (id) => {
    const next = selectedCats.includes(id)
      ? selectedCats.filter((c) => c !== id)
      : [...selectedCats, id]
    setValue('category_ids', next)
  }

  // Combine existing + newly uploaded images for display
  const existingImages = defaultValues?.images ?? []
  const allImages = [
    ...existingImages,
    ...pendingImages.map((sk, i) => ({ id: `pending-${i}`, storage_key: sk, _pending: true })),
  ]

  const handleUploaded = async (storageKey) => {
    if (defaultValues?.id) {
      // For existing products: attach image immediately via a temp approach — 
      // we just track it and submit all at once via product update
      setPendingImages((prev) => [...prev, storageKey])
    } else {
      setPendingImages((prev) => [...prev, storageKey])
    }
  }

  const handleDeleteImage = async () => {
    if (!deleteImageTarget || !defaultValues?.id) return
    setDeletingImage(true)
    try {
      await filesApi.upload // No delete endpoint exposed in filesApi; use client directly
      // Actually use the product update to drop an image: 
      // We'll just remove from pending/local state for now
      // For real backend image deletion use DELETE /files/<key>
      import('@/api/client').then(async ({ default: client }) => {
        await client.delete(`/files/${deleteImageTarget.storage_key}`)
        setPendingImages((prev) => prev.filter((sk) => sk !== deleteImageTarget.storage_key))
        qc.invalidateQueries({ queryKey: ['products'] })
        toast.success('Image deleted')
        setDeleteImageTarget(null)
        setDeletingImage(false)
      })
    } catch {
      toast.error('Delete failed')
      setDeletingImage(false)
    }
  }

  const submit = (data) => {
    const payload = {
      ...data,
      price_amount: Math.round(parseFloat(data.price_amount) * 100),
    }
    // Attach pending image storage keys and main image
    if (pendingImages.length > 0) payload.image_storage_keys = pendingImages
    if (localMainId && typeof localMainId === 'number') payload.main_image_id = localMainId
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {/* Active toggle */}
      <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
        <span className="text-sm font-bold text-stone-700">Product Active</span>
        <button
          type="button"
          onClick={() => setValue('is_active', !isActive)}
          className={`flex items-center gap-1.5 text-sm font-bold transition-colors
            ${isActive ? 'text-fresh-600' : 'text-stone-400'}`}
        >
          {isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <div>
        <label className="block text-sm font-bold text-stone-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className="input resize-none text-sm"
          placeholder="Describe this product..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Price (₪)" type="number" step="0.01" error={errors.price_amount?.message} {...register('price_amount')} />
        <Input label="Quantity" type="number" error={errors.quantity?.message} {...register('quantity')} />
      </div>

      {/* Categories */}
      <div>
        <p className="text-sm font-bold text-stone-700 mb-2">Categories</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all
                ${selectedCats.includes(cat.id)
                  ? 'bg-brand-500 text-white border-brand-600'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
            >{cat.name}</button>
          ))}
        </div>
        {errors.category_ids && <p className="text-red-500 text-sm mt-1">{errors.category_ids.message}</p>}
      </div>

      {/* Images */}
      <ImageUploader
        productId={defaultValues?.id}
        images={allImages}
        mainImageId={localMainId}
        onUploaded={handleUploaded}
        onSetMain={(id) => {
          setLocalMainId(id)
          if (defaultValues?.id && typeof id === 'number') {
            // Immediately persist main image
            productsApi.update(defaultValues.id, { main_image_id: id })
              .then(() => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Main image updated!') })
              .catch(() => toast.error('Failed to set main image'))
          }
        }}
        onDeleted={(img) => {
          if (img._pending) {
            setPendingImages((prev) => prev.filter((sk) => sk !== img.storage_key))
          } else {
            setDeleteImageTarget(img)
          }
        }}
      />

      <Button type="submit" loading={loading} className="mt-2">Save Product</Button>

      <ConfirmDialog
        open={!!deleteImageTarget}
        onClose={() => setDeleteImageTarget(null)}
        onConfirm={handleDeleteImage}
        loading={deletingImage}
        title="Delete Image?"
        message="This will permanently remove this image."
      />
    </form>
  )
}

// ── Quick Stats Bar ────────────────────────────────────────────────────────────
function StatsBar({ products }) {
  const total = products.length
  const active = products.filter((p) => p.is_active !== false).length
  const outOfStock = products.filter((p) => p.quantity === 0).length
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 5).length

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Total', value: total, color: 'bg-stone-100 text-stone-700' },
        { label: 'Active', value: active, color: 'bg-fresh-50 text-fresh-700' },
        { label: 'Low Stock', value: lowStock, color: 'bg-amber-50 text-amber-700' },
        { label: 'Out of Stock', value: outOfStock, color: 'bg-red-50 text-red-600' },
      ].map(({ label, value, color }) => (
        <div key={label} className={`rounded-2xl px-4 py-3 ${color}`}>
          <p className="text-2xl font-display">{value}</p>
          <p className="text-xs font-semibold opacity-70">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filter, setFilter] = useState('all') // all | active | low | out
  const [expandedId, setExpandedId] = useState(null)

  const { data: products = [], isLoading } = useProducts({ search: search || undefined })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })
  const { mutate: create, isPending: creating } = useCreateProduct()
  const { mutate: update, isPending: updating } = useUpdateProduct()
  const { mutate: remove, isPending: deleting } = useDeleteProduct()
  const qc = useQueryClient()

  const closeModal = () => setModal(null)

  const filtered = products.filter((p) => {
    if (filter === 'active') return p.is_active !== false && p.quantity > 0
    if (filter === 'low') return p.quantity > 0 && p.quantity <= 5
    if (filter === 'out') return p.quantity === 0
    return true
  })

  const toggleActive = (p) => {
    update(
      { id: p.id, data: { is_active: !(p.is_active !== false) } },
      { onSuccess: () => toast.success(`Product ${p.is_active !== false ? 'deactivated' : 'activated'}`) }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display text-stone-800">Products 📦</h1>
        <Button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && <StatsBar products={products} />}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: '✅ Active' },
            { key: 'low', label: '⚠️ Low Stock' },
            { key: 'out', label: '❌ Out' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                ${filter === key
                  ? 'bg-brand-500 text-white border-brand-600'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-fun overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 bg-stone-50">
                <th className="text-left p-4 font-bold text-stone-600">Product</th>
                <th className="text-left p-4 font-bold text-stone-600 hidden md:table-cell">Categories</th>
                <th className="text-left p-4 font-bold text-stone-600">Price</th>
                <th className="text-left p-4 font-bold text-stone-600">Stock</th>
                <th className="text-left p-4 font-bold text-stone-600 hidden sm:table-cell">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <>
                  <tr
                    key={p.id}
                    className={`border-b border-stone-100 hover:bg-stone-50 transition-colors
                      ${p.is_active === false ? 'opacity-50' : ''}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                          <ProductImage storageKey={p.main_image?.storage_key} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="font-semibold text-stone-800 block">{p.name}</span>
                          {p.description && (
                            <span className="text-stone-400 text-xs line-clamp-1 max-w-[180px]">{p.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.categories?.map((c) => (
                          <span key={c.id} className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-semibold">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-display text-brand-600">{formatPrice(p.price_amount)}</td>
                    <td className="p-4">
                      <span className={`font-bold ${p.quantity === 0 ? 'text-red-500' : p.quantity <= 5 ? 'text-amber-500' : 'text-fresh-600'}`}>
                        {p.quantity === 0 ? '❌ 0' : p.quantity <= 5 ? `⚠️ ${p.quantity}` : p.quantity}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg transition-colors
                          ${p.is_active !== false
                            ? 'text-fresh-700 bg-fresh-50 hover:bg-fresh-100'
                            : 'text-stone-400 bg-stone-100 hover:bg-stone-200'
                          }`}
                      >
                        {p.is_active !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {p.is_active !== false ? 'Active' : 'Off'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-400 hover:text-stone-600"
                          title="View images"
                        >
                          {expandedId === p.id ? <ChevronUp size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          onClick={() => setModal({ mode: 'edit', product: p })}
                          className="p-2 hover:bg-brand-50 hover:text-brand-500 rounded-xl transition-colors"
                        ><Pencil size={15} /></button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                        ><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded image gallery row */}
                  {expandedId === p.id && (
                    <tr key={`${p.id}-expanded`} className="bg-stone-50 border-b border-stone-100">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {p.images?.length > 0 ? (
                            p.images.map((img) => (
                              <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border-2
                                                            border-stone-200 flex-shrink-0">
                                <ProductImage storageKey={img.storage_key} alt="" className="w-full h-full object-cover" />
                                {img.id === p.main_image_id && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-brand-500/80 text-white
                                                  text-[9px] font-bold text-center py-0.5">MAIN</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-stone-400 text-sm italic">No images yet — click Edit to upload</p>
                          )}
                          <button
                            onClick={() => { setModal({ mode: 'edit', product: p }); setExpandedId(null) }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-dashed
                                       border-stone-300 text-stone-400 hover:border-brand-400 hover:text-brand-500
                                       transition-colors text-xs font-bold"
                          >
                            <Upload size={12} /> Manage Images
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-stone-400">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.mode === 'create' ? '✨ Add Product' : `✏️ Edit: ${modal?.product?.name}`}
        size="lg"
      >
        <ProductForm
          defaultValues={modal?.product}
          categories={categories}
          loading={creating || updating}
          onSubmit={(data) => {
            if (modal?.mode === 'create') {
              create(data, { onSuccess: closeModal })
            } else {
              update({ id: modal.product.id, data }, { onSuccess: closeModal })
            }
          }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { remove(deleteTarget.id); setDeleteTarget(null) }}
        loading={deleting}
        title="Delete Product?"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  )
}