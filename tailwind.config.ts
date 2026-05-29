import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        'bg-1':  'var(--bg-1)',
        'bg-2':  'var(--bg-2)',
        'bg-3':  'var(--bg-3)',
        ink:     'var(--text-1)',
        'ink-2': 'var(--text-2)',
        'ink-3': 'var(--text-3)',
        accent:  'var(--accent)',
        ok:      'var(--ok)',
        err:     'var(--err)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        brand: '0.22em',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.85)' },
          '50%':       { opacity: '0.7', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up':   'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':   'fade-in 0.3s ease-out forwards',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
        'slide-up':  'slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [],
}

export default config
