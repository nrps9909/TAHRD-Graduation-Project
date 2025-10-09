/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 高級夜間模式配色方案 - 深色優雅主題
        dark: {
          bg: {
            primary: "#0f0f14",      // 主背景 - 深藍灰
            secondary: "#1a1a24",    // 次要背景
            tertiary: "#25252f",     // 第三層背景
            elevated: "#2d2d3a",     // 懸浮元素背景
            hover: "#35354a",        // 懸停狀態
          },
          text: {
            primary: "#e8e8f0",      // 主要文字
            secondary: "#a8a8b8",    // 次要文字
            tertiary: "#78788a",     // 輔助文字
            muted: "#58586a",        // 靜音文字
            accent: "#c794ff",       // 強調文字
          },
          accent: {
            primary: "#7c5cff",      // 主要強調色 - 紫色
            secondary: "#ff6eb4",    // 次要強調色 - 粉色
            tertiary: "#00d4ff",     // 第三強調色 - 青色
            success: "#5cff7c",      // 成功綠
            warning: "#ffb85c",      // 警告橙
            error: "#ff5c5c",        // 錯誤紅
          },
          border: {
            subtle: "#2a2a38",       // 微妙邊框
            medium: "#35354a",       // 中等邊框
            strong: "#45455a",       // 強烈邊框
            accent: "#7c5cff40",     // 強調邊框
          },
          glow: {
            purple: "#7c5cff30",     // 紫色光暈
            pink: "#ff6eb430",       // 粉色光暈
            cyan: "#00d4ff30",       // 青色光暈
            white: "#ffffff10",      // 白色光暈
          }
        },
        // 夜間模式專用漸變色
        gradient: {
          purple: "linear-gradient(135deg, #7c5cff, #a78bfa)",
          pink: "linear-gradient(135deg, #ff6eb4, #ff9ece)",
          cyan: "linear-gradient(135deg, #00d4ff, #5ce1e6)",
          warm: "linear-gradient(135deg, #7c5cff, #ff6eb4)",
          cool: "linear-gradient(135deg, #00d4ff, #7c5cff)",
        },
        // 心語小鎮特有的療癒色彩 - Animal Crossing 风格 (保留用於特殊用途)
        healing: {
          warm: "#F4E4C1",
          gentle: "#E8F4F8",
          soft: "#F0E6FF",
          nature: "#E6F7E6",
          sunset: "#FFE6E1",
          peach: "#FFE5D9",
          mint: "#D4F1F4",
          lavender: "#E8D5F2",
          cream: "#FFF8E7",
          sky: "#C3E5FF",
        },
        // 可爱糖果色 (保留用於特殊用途)
        candy: {
          pink: "#FFB3D9",
          blue: "#B3D9FF",
          yellow: "#FFF9B3",
          green: "#B3FFD9",
          purple: "#D9B3FF",
          orange: "#FFD9B3",
        },
        // 白噗噗專屬療癒色系 (保留用於特殊用途)
        baby: {
          pink: "#FFD4E5",
          yellow: "#FFF4D4",
          peach: "#FFE5DB",
          cream: "#FFF9E6",
          blush: "#FFE0EC",
          butter: "#FFECB3",
        },
        // 柔和自然色 (保留用於特殊用途)
        pastel: {
          grass: "#A8E6A3",
          water: "#A3D5E6",
          sand: "#F5E6D3",
          wood: "#D4A574",
          stone: "#C4C4C4",
        },
        // 動物森友會風格色彩 (保留用於特殊用途)
        brown: {
          100: "#F7F3E9",
          200: "#F0E6D2",
          300: "#E8D5B7",
          400: "#D4B896",
          500: "#C19A6B",
          600: "#A67C52",
          700: "#8B6914",
          800: "#6B4E3D",
          900: "#4A3428",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
        cute: "1.25rem",      // 可爱圆角
        bubble: "2rem",       // 气泡圆角
      },
      boxShadow: {
        // 可爱柔和阴影
        cute: "0 4px 14px 0 rgba(0, 0, 0, 0.08)",
        "cute-lg": "0 8px 24px 0 rgba(0, 0, 0, 0.12)",
        "cute-xl": "0 12px 32px 0 rgba(0, 0, 0, 0.15)",
        glow: "0 0 20px rgba(255, 182, 217, 0.4)",
        "glow-blue": "0 0 20px rgba(179, 217, 255, 0.4)",
        "glow-green": "0 0 20px rgba(179, 255, 217, 0.4)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
      },
      borderWidth: {
        '3': '3px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gentle-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        "scale-in": {
          "0%": { transform: "scale(0.8)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "slide-down": {
          "0%": { transform: "translateY(-20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        "slide-left": {
          "0%": { transform: "translateX(20px)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        "phone-appear": {
          "0%": { opacity: 0, transform: "scale(0.8)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(3deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: 0 },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "pop": {
          "0%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "heartbeat": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.1)" },
          "50%": { transform: "scale(1)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.7, transform: "scale(0.95)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "swing": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(5deg)" },
          "75%": { transform: "rotate(-5deg)" },
        },
        "pulse-gentle": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.7 },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "gentle-float": "gentle-float 3s ease-in-out infinite",
        "gentle-bounce": "gentle-bounce 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "slide-in-left": "slide-in-left 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "phone-appear": "phone-appear 0.5s ease-out",
        "float": "float 4s ease-in-out infinite",
        "float-delayed": "float-delayed 4s ease-in-out infinite 2s",
        "wiggle": "wiggle 0.5s ease-in-out",
        "bounce-in": "bounce-in 0.6s ease-out",
        "pop": "pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "shake": "shake 0.5s ease-in-out",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
        "swing": "swing 1s ease-in-out infinite",
        "pulse-gentle": "pulse-gentle 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
      },
      // 可爱字体大小
      fontSize: {
        'cute-xs': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
        'cute-sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        'cute-base': ['1rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'cute-lg': ['1.125rem', { lineHeight: '1.6', letterSpacing: '0.01em' }],
        'cute-xl': ['1.25rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'cute-2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '0' }],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
}