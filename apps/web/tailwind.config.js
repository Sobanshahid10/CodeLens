/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
          950: '#0f0e2b',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow-indigo': '0 0 24px rgba(99, 102, 241, 0.4)',
        'glow-purple': '0 0 24px rgba(139, 92, 246, 0.35)',
        'glow-emerald': '0 0 24px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.22s ease-out both',
        'scale-in': 'fadeInScale 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up': 'slideUp 0.18s ease-out both',
        'toast-in': 'toastIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        'palette-in': 'paletteIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0', transform: 'translateY(6px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        fadeInScale: { from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        toastIn:     { from: { opacity: '0', transform: 'translateX(24px) scale(0.95)' }, to: { opacity: '1', transform: 'translateX(0) scale(1)' } },
        paletteIn:   { from: { opacity: '0', transform: 'scale(0.97) translateY(-12px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
      },
    },
  },
  plugins: [],
};
