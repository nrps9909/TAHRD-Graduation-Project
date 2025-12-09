/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Apple-style Dark Theme
        'bg-primary': '#000000',
        'bg-secondary': '#1c1c1e',
        'bg-tertiary': '#2c2c2e',
        'bg-hover': '#3a3a3c',

        // Text colors - Apple style
        'text-primary': '#f5f5f7',
        'text-secondary': '#86868b',
        'text-muted': '#6e6e73',

        // Accent color - Apple Blue
        'accent': '#0071e3',
        'accent-hover': '#0077ed',

        // Border colors - subtle
        'border-primary': 'rgba(255,255,255,0.1)',
        'border-secondary': 'rgba(255,255,255,0.15)',

        // Apple system colors
        'apple-blue': '#0071e3',
        'apple-blue-light': '#2997ff',
        'apple-gray': {
          50: '#f5f5f7',
          100: '#e8e8ed',
          200: '#d2d2d7',
          300: '#86868b',
          400: '#6e6e73',
          500: '#424245',
          600: '#3a3a3c',
          700: '#2c2c2e',
          800: '#1c1c1e',
          900: '#000000',
        },
        'apple-green': '#30d158',
        'apple-red': '#ff453a',
        'apple-orange': '#ff9f0a',
        'apple-yellow': '#ffd60a',
        'apple-purple': '#bf5af2',
        'apple-pink': '#ff375f',
        'apple-teal': '#64d2ff',

        // Legacy compatibility - mapped to Apple theme
        'cat-cream': '#2c2c2e',
        'cat-beige': '#3a3a3c',
        'cat-pink': '#0071e3',
        'cat-pink-dark': '#0077ed',
        'cat-purple': '#bf5af2',
        'cat-purple-dark': '#a445db',
        'cat-blue': '#0071e3',
        'cat-blue-dark': '#0077ed',
        'cat-yellow': '#ffd60a',
        'cat-orange': '#ff9f0a',
        'cat-brown': '#6e6e73',
        'cat-gray': '#3a3a3c',
        'cat-dark': '#1c1c1e',

        // Terminal colors - Apple style
        'terminal-bg': '#1c1c1e',
        'terminal-text': '#f5f5f7',
        'retro-bg': '#1c1c1e',
        'retro-green': '#30d158',
        'retro-amber': '#ff9f0a',
        'retro-coral': '#ff453a',
        'retro-peach': '#ff6961',
        'retro-cyan': '#64d2ff',
        'retro-blue': '#0071e3',
        'retro-purple': '#bf5af2',
        'retro-yellow': '#ffd60a',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'Noto Sans TC', 'Helvetica Neue', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        chinese: ['Noto Sans TC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.33', letterSpacing: '-0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.43', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.33', letterSpacing: '-0.02em' }],
        '3xl': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        '6xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
      },
      boxShadow: {
        'apple': '0 4px 16px rgba(0,0,0,0.12)',
        'apple-lg': '0 8px 32px rgba(0,0,0,0.16)',
        'apple-xl': '0 16px 48px rgba(0,0,0,0.2)',
        'apple-glow': '0 0 40px rgba(0,113,227,0.3)',
        'apple-inset': 'inset 0 0 0 1px rgba(255,255,255,0.1)',
      },
      backdropBlur: {
        'apple': '20px',
        'apple-lg': '40px',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'apple-bounce': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
