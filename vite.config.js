import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5175,
        watch: {
            usePolling: true,
        },
        proxy: {
            // All /api/* requests go through the PSS API Gateway, which
            // validates the token against ARMS and routes to the correct
            // downstream module (service-catalogue, kpi-sla, commitment).
            '/api': {
                target: process.env.API_GATEWAY_URL || 'http://127.0.0.1:4003',
                changeOrigin: true,
            },
        },
    },
})