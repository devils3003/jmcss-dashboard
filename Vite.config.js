import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0', // 👈 This opens the door for the Dev Tunnel to connect!
        port: 5173,
        strictPort: true,
        allowedHosts: true,
        watch: null
    }
})