import client from './client'

export const ordersApi = {
  list:     (params)   => client.get('/orders', { params }),
  get:      (id)       => client.get(`/orders/${id}`),
  create:   (data)     => client.post('/orders/checkout', data),  // ← was /orders (wrong!)
  cancel:   (id)       => client.post(`/orders/${id}/cancel`),
  update:   (id, data) => client.put(`/orders/${id}`, data),
  delete:   (id)       => client.delete(`/orders/${id}`),
}