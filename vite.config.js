import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'path'

// CivicSync root vite config — delegates to frontend/ subdirectory
// so that `npm run dev` from the project root serves the full teammate UI.
export default defineConfig({
  root: resolve(__dirname, 'frontend'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
