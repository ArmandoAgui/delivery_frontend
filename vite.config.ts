import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/restaurants': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/products': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/categories': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/promotions': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
