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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Three.js and 3D rendering libraries
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],

          // Apollo GraphQL
          'apollo-vendor': ['@apollo/client', 'graphql'],

          // Other large dependencies
          'ui-vendor': ['zustand', 'date-fns', 'socket.io-client'],
        },
      },
    },
    // Increase chunk size warning limit to 1000 KB
    chunkSizeWarningLimit: 1000,
  },
})