import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development, forward /api requests to the Express server.
    // The browser then sees one origin (localhost:5173), so cookies just work.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
