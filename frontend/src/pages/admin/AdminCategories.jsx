import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { categoriesApi } from '@/api/categories'
import { filesApi } from '@/api/files'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Spinner from '@/components/ui/Spinner'
import ProductImage from '@/components/ui/ProductImage'

const schema = z.object({
  name:        z.string().min(1, 'Required'),
  description: z.string().optional(),
})

// ── Category Image Uploader ────────────────────────────────────────────────────
function CategoryImageUpload({ currentKey, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await filesApi.upload(file, 'categories')
      onUploaded(res.data.storage_key)
      toast.success('Image uploaded!')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-1">
        <ImageIcon size={14} /> Category Image
      </p>
      {currentKey && (
        <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-stone-200 mb-3 bg-stone-50">
          <ProductImage storageKey={currentKey} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed
                   border-stone-300 hover:border-brand-400 hover:bg-brand-50 transition-colors
                   text-sm font-semibold text-stone-500 hover:text-brand-500 w-full justify-center"
      >
        {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
        {uploading ? 'Uploading...' : currentKey ? 'Replace Image' : 'Upload Image'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  )
}

// ── Category Form ──────────────────────────────────────────────────────────────
function CategoryForm({ defaultValues, onSubmit, loading }) {
  const [imageKey, setImageKey] = useState(defaultValues?.image?.storage_key ?? null)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', description: '' },
  })

  const submit = (data) => {
    const payload = { ...data }
    if (imageKey) payload.image_storage_key = imageKey
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Input label="Description" error={errors.description?.message} {...register('description')} />
      <CategoryImageUpload currentKey={imageKey} onUploaded={setImageKey} />
      <Button type="submit" loading={loading}>Save Category</Button>
    </form>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminCategories() {
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const qc = useQueryClient()

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })

  const create = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category created!'); setModal(null) },
    onError: (e) => toast.error(e?.response?.data?.message ?? 'Failed to create'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Updated!'); setModal(null) },
    onError: () => toast.error('Failed to update'),
  })

  const remove = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast.success('Deleted'); setDeleteTarget(null) },
    onError: () => toast.error('Failed to delete'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-stone-800">Categories 🏷️</h1>
          <p className="text-stone-400 text-sm mt-0.5">{categories.length} categories</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="card p-0 overflow-hidden flex flex-col">
            {/* Image area */}
            <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-200 relative overflow-hidden">
              {cat.image?.storage_key ? (
                <ProductImage
                  storageKey={cat.image.storage_key}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={32} className="text-stone-300" />
                </div>
              )}
              {/* Product count badge */}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg
                              px-2 py-0.5 text-xs font-bold text-stone-600">
                {cat.products?.length ?? 0} items
              </div>
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col gap-2 flex-1">
              <div>
                <p className="font-bold text-stone-800">{cat.name}</p>
                {cat.description && (
                  <p className="text-stone-400 text-xs mt-0.5 line-clamp-2">{cat.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-1">
                <button
                  onClick={() => setModal({ mode: 'edit', category: cat })}
                  className="flex-1 py-1.5 rounded-xl border-2 border-stone-200 text-xs font-bold
                             hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="flex-1 py-1.5 rounded-xl border-2 border-stone-200 text-xs font-bold
                             hover:border-red-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new card */}
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="card p-5 flex flex-col items-center justify-center gap-3 border-dashed
                     hover:border-brand-400 hover:bg-brand-50 transition-colors min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
            <Plus size={20} className="text-stone-400" />
          </div>
          <span className="text-sm font-bold text-stone-400">New Category</span>
        </button>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? '✨ Add Category' : `✏️ Edit: ${modal?.category?.name}`}
        size="sm"
      >
        <CategoryForm
          defaultValues={modal?.category}
          loading={create.isPending || update.isPending}
          onSubmit={(data) => modal?.mode === 'create'
            ? create.mutate(data)
            : update.mutate({ id: modal.category.id, data })
          }
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate(deleteTarget.id)}
        loading={remove.isPending}
        title="Delete Category?"
        message={`Delete "${deleteTarget?.name}"? Products in this category won't be deleted.`}
      />
    </div>
  )
}