/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Baby pink and duck yellow themed colors
        'cat-cream': '#FFF9E6', // Light duck yellow
        'cat-beige': '#FFEAA7', // Duck yellow
        'cat-pink': '#F8BBD9', // Baby pink
        'cat-pink-dark': '#F48FB1', // Deeper baby pink
        'cat-purple': '#F8BBD9', // Baby pink tone
        'cat-purple-dark': '#E91E63', // Rose pink
        'cat-blue': '#F8BBD9', // Converted to baby pink
        'cat-blue-dark': '#F48FB1', // Deeper baby pink
        'cat-yellow': '#FFEAA7', // Duck yellow
        'cat-orange': '#FFD54F', // Soft yellow
        'cat-brown': '#D2B48C', // Keep neutral
        'cat-gray': '#F5F5F5', // Keep neutral
        'cat-dark': '#8B4B7C', // Deep pink-purple
        'text-primary': '#8B4B7C', // Deep pink-purple
        'text-secondary': '#AD1457', // Rose pink
        'text-light': '#E91E63', // Bright pink

        // Baby pink terminal colors
        'terminal-bg': '#FFF8F5', // Very light pink
        'terminal-text': '#8B4B7C', // Deep pink-purple
        'retro-bg': '#FFF0F3', // Light pink background
        'retro-green': '#FFEAA7', // Duck yellow
        'retro-amber': '#FFD54F', // Soft yellow
        'retro-coral': '#F8BBD9', // Baby pink
        'retro-peach': '#F8BBD9', // Baby pink
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
        pixel: ['Press Start 2P', 'cursive'],
        cute: ['jf open 粉圓', 'Comfortaa', 'cursive'],
        chinese: ['jf open 粉圓', 'Noto Sans TC', 'sans-serif'],
        display: ['jf open 粉圓', 'Comfortaa', 'sans-serif'],
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        glow: 'glow 2s ease-in-out infinite',
        typewriter: 'typewriter 2s steps(40) 1s forwards',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(248, 187, 217, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(248, 187, 217, 0.8)' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
