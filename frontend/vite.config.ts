import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  envDir: '../', // 從根目錄載入 .env
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'three': path.resolve(__dirname, 'node_modules/three'),
    },
    dedupe: ['three'],
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.TTC', '**/*.ttc', '**/*.ttf', '**/*.otf'],
})