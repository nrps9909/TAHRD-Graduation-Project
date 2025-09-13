import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'three': path.resolve(__dirname, 'node_modules/three'),
    },
    dedupe: ['three'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,         // 改用預設 5173 較穩
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.TTC', '**/*.ttc', '**/*.ttf', '**/*.otf'],
})