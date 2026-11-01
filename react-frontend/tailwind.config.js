/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        gold: {
          50: '#FFFDF5',
          100: '#FFF9E6',
          200: '#FFEEC0',
          300: '#FFE07D',
          400: '#F5B942',
          500: '#E5A92E',
          600: '#D99726',
          DEFAULT: '#F5B942',
          hover: '#E5A92E',
          glow: 'rgba(245, 185, 66, 0.35)',
        },
        surface: {
          main: 'var(--bg-main)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
          input: 'var(--bg-input)',
        }
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
};

