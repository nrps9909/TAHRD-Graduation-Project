/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme - ChatGPT style
        'bg-primary': '#212121',
        'bg-secondary': '#171717',
        'bg-tertiary': '#2f2f2f',
        'bg-hover': '#424242',

        // Text colors
        'text-primary': '#ececec',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',

        // Accent color - ChatGPT green
        'accent': '#10a37f',
        'accent-hover': '#1ed89e',

        // Border colors
        'border-primary': '#2f2f2f',
        'border-secondary': '#424242',

        // Legacy compatibility - mapped to dark theme
        'cat-cream': '#2f2f2f',
        'cat-beige': '#424242',
        'cat-pink': '#10a37f',
        'cat-pink-dark': '#0d8a6f',
        'cat-purple': '#10a37f',
        'cat-purple-dark': '#0d8a6f',
        'cat-blue': '#3b82f6',
        'cat-blue-dark': '#2563eb',
        'cat-yellow': '#fbbf24',
        'cat-orange': '#f59e0b',
        'cat-brown': '#78716c',
        'cat-gray': '#424242',
        'cat-dark': '#171717',

        // Terminal colors - dark
        'terminal-bg': '#0d0d0d',
        'terminal-text': '#ececec',
        'retro-bg': '#171717',
        'retro-green': '#10a37f',
        'retro-amber': '#fbbf24',
        'retro-coral': '#f87171',
        'retro-peach': '#fca5a5',
        'retro-cyan': '#22d3ee',
        'retro-blue': '#60a5fa',
        'retro-purple': '#a78bfa',
        'retro-yellow': '#fbbf24',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
        chinese: ['Noto Sans TC', 'Inter', 'sans-serif'],
        display: ['Inter', 'Noto Sans TC', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
