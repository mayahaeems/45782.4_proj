import client from './client'

export const categoriesApi = {
  list:   ()          => client.get('/categories'),
  get:    (id)        => client.get(`/categories/${id}`),
  create: (data)      => client.post('/categories', data),
  update: (id, data)  => client.put(`/categories/${id}`, data),
  delete: (id)        => client.delete(`/categories/${id}`),
}
