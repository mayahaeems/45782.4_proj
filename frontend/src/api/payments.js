import client from './client'

export const paymentsApi = {
  create:  (data)      => client.post('/payments', data),
  get:     (id)        => client.get(`/payments/${id}`),
  refund:  (id)        => client.post(`/payments/${id}/refund`),
}
