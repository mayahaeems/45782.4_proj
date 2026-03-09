import client from './client'

export const productsApi = {
  list:      (params) => client.get('/products', { params }),
  get:       (id)     => client.get(`/products/${id}`),
  create:    (data)   => client.post('/products', data),
  update:    (id, data) => client.put(`/products/${id}`, data),
  delete:    (id)     => client.delete(`/products/${id}`),
  search:    (q)      => client.get('/products', { params: { search: q } }),
}
