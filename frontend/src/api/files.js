import client from './client'

export const filesApi = {
  upload: (file, folder = 'products') => {
    const form = new FormData()
    form.append('file', file)
    return client.post(`/files/upload?folder=${folder}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  url: (storageKey) => storageKey ? `/files/${storageKey}` : null,
}
