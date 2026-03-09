import client from './client'

export const deliveryApi = {
  // Active orders assigned to current delivery person (assigned / on_the_way)
  myOrders:    ()         => client.get('/delivery/orders'),

  // Completed orders (delivered / canceled) for current delivery person
  myHistory:   ()         => client.get('/delivery/orders', { params: { history: 'true' } }),

  // Single order detail
  getOrder:    (id)       => client.get(`/delivery/orders/${id}`),

  // Update delivery status (delivery person only: strict transitions)
  updateStatus: (id, data) => client.put(`/delivery/orders/${id}/status`, data),

  // Assign delivery person to order (admin only)
  assign:       (id, data) => client.post(`/delivery/orders/${id}/assign`, data),
}