import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // If deploying to a subfolder on GitHub Pages, set base:
  // base: '/store-reports/',
})
