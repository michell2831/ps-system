import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
    proxy: {
      // All /api/* requests go through the PSS API Gateway, which validates
      // the token against ARMS and routes to the correct downstream module
      // (service-catalogue, kpi-sla, commitment).
      '/api': {
        target: process.env.PROXY_GATEWAY_URL || 'http://127.0.0.1:4003',
        changeOrigin: true,
      },
    },
  },
})
