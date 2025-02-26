import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    },
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  }
})