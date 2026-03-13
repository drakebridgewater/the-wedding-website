import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/static/dist/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '../static/dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        budget: resolve(__dirname, 'src/budget/main.tsx'),
        estimator: resolve(__dirname, 'src/estimator/main.tsx'),
        vendors: resolve(__dirname, 'src/vendors/main.tsx'),
        todos: resolve(__dirname, 'src/todos/main.tsx'),
        'todos-quick-add': resolve(__dirname, 'src/todos/quick-add-main.tsx'),
        seating: resolve(__dirname, 'src/seating/main.tsx'),
      },
    },
  },
  server: {
    port: 5173,
    cors: true,
    origin: 'http://localhost:5173',
  },
})
