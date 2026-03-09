import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'

export const useProducts = (params) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.list(params).then((r) => r.data),
  })

export const useProduct = (id) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.get(id).then((r) => r.data),
    enabled: !!id,
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })
}
