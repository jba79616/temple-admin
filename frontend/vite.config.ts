import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'API_')
  return {
    plugins: [react()],
    build: {
      outDir: '../backend/src/main/resources/static',
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': `http://localhost:${env.API_PORT || 8080}`,
      },
    },
    test: {
      environment: 'node',
    },
  }
})
