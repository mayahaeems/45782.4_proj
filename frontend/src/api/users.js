import client from './client'

export const usersApi = {
  // ── Self endpoints (all roles) ─────────────────────────────────────────────
  getMe:    ()           => client.get('/users/me'),
  updateMe: (data)       => client.put('/users/me', data),
  deleteMe: ()           => client.delete('/users/me'),

  // ── Admin + delivery lookup ────────────────────────────────────────────────
  getById:  (id)         => client.get(`/users/${id}`),

  // ── Admin only ─────────────────────────────────────────────────────────────
  list:     (params)     => client.get('/users', { params }),
  create:   (data)       => client.post('/users', data),
  update:   (id, data)   => client.put(`/users/${id}`, data),
  delete:   (id)         => client.delete(`/users/${id}`),
}