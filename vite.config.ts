import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path resolution
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/hooks': '/src/hooks',
      '@/services': '/src/services',
      '@/store': '/src/store',
      '@/utils': '/src/utils',
      '@/types': '/src/types',
      '@/config': '/src/config',
      '@/lib': '/src/lib',
      '@/data': '/src/data',
      '@/assets': '/src/assets',
    },
  },

  // Development server configuration
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Manual chunks configuration for better code splitting
        manualChunks: id => {
          // React and related
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react-vendor'
          }

          // Animation libraries
          if (
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/canvas-confetti')
          ) {
            return 'animation-vendor'
          }

          // UI libraries
          if (
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/prism-react-renderer')
          ) {
            return 'ui-vendor'
          }

          // State management
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor'
          }

          // AI/Gemini
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'ai-vendor'
          }

          // Editor
          if (
            id.includes('node_modules/@monaco-editor') ||
            id.includes('node_modules/monaco-editor')
          ) {
            return 'editor'
          }

          // Live2D and PIXI
          if (id.includes('pixi') || id.includes('live2d')) {
            return 'live2d'
          }
        },

        // Asset file naming
        assetFileNames: 'assets/[name]-[hash][extname]',

        // Chunk file naming
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `js/[name]-${facadeModuleId}-[hash].js`
        },

        // Entry file naming
        entryFileNames: 'js/[name]-[hash].js',
      },
    },

    // Optimize for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    // Enable source maps for production debugging
    sourcemap: false,

    // Target modern browsers for smaller bundles
    target: 'es2023',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'zustand',
    ],
    exclude: ['pixi-live2d-display-lipsync', '@google/generative-ai'],
  },
})
