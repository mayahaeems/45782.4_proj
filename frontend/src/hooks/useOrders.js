import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'

export const useOrders = (params) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params).then((r) => r.data),
  })

export const useOrder = (id) =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.get(id).then((r) => r.data),
    enabled: !!id,
  })

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Order failed'),
  })
}

export const useCancelOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order cancelled')
    },
    onError: () => toast.error('Cannot cancel this order'),
  })
}
