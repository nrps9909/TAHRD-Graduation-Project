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
    host: true,
    port: 3000,
  },
  publicDir: 'public',
  assetsInclude: ['**/*.TTC', '**/*.ttc', '**/*.ttf', '**/*.otf'],
})