import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'k-yongho.iptime.org',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://k-yongho.iptime.org:8080', // 외부에서 접근 가능한 백엔드 주소
        changeOrigin: true
      }
    }
  }
})