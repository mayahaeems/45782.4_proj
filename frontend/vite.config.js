import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api':             { target: 'http://localhost:5000', changeOrigin: true },
      '/auth':            { target: 'http://localhost:5000', changeOrigin: true },
      '/products':        { target: 'http://localhost:5000', changeOrigin: true },
      '/categories':      { target: 'http://localhost:5000', changeOrigin: true },
      '/cart':            { target: 'http://localhost:5000', changeOrigin: true },
      '/orders':          { target: 'http://localhost:5000', changeOrigin: true },
      '/payments':        { target: 'http://localhost:5000', changeOrigin: true },
      '/delivery':        { target: 'http://localhost:5000', changeOrigin: true },
      '/files':           { target: 'http://localhost:5000', changeOrigin: true },
      '/users':           { target: 'http://localhost:5000', changeOrigin: true },
      '/inventory-logs':  { target: 'http://localhost:5000', changeOrigin: true },
      '/category-logs':   { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})
