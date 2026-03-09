import client from './client'

export const cartApi = {
  get:       ()              => client.get('/cart'),
  addItem:   (data)          => client.post('/cart/items', data),
  updateItem:(itemId, data)  => client.put(`/cart/items/${itemId}`, data),
  removeItem:(itemId)        => client.delete(`/cart/items/${itemId}`),
  clear:     ()              => client.delete('/cart'),
}
