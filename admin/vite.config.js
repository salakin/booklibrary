import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served from https://<user>.github.io/booklibrary/ in production, but
  // from the dev server root during local development.
  base: command === 'build' ? '/booklibrary/' : '/',
}))
