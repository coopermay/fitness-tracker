import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api requests to the FastAPI dev server, so the browser only
    // talks to one origin and we don't need CORS in development.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
