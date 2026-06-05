import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Base palette
        ivory: {
          50:  '#FDFBF7',
          100: '#FAF7F0',
          200: '#F5EFE0',
          300: '#EDE3CC',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          soft:    '#2D2D2D',
          muted:   '#4A4A4A',
          light:   '#6B6B6B',
        },
        sage: {
          100: '#E8F0EB',
          200: '#C8DDD0',
          400: '#7FAF93',
          600: '#4A8A63',
        },
        amber: {
          100: '#FDF3E0',
          200: '#FAE3B4',
          400: '#F5B942',
          600: '#D4891A',
        },
        rose: {
          100: '#FDECEA',
          400: '#E87B73',
          600: '#C94B41',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float':      'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'bloom':      'bloom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        bloom: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        }
      },
      boxShadow: {
        'warm-sm': '0 2px 8px rgba(26,26,26,0.06)',
        'warm-md': '0 4px 24px rgba(26,26,26,0.08)',
        'warm-lg': '0 8px 48px rgba(26,26,26,0.12)',
      }
    }
  },
  plugins: [],
};

export default config;
