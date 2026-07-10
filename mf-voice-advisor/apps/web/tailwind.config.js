/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef2f8', 100: '#d5dfee', 200: '#abbfdd',
          300: '#809fcc', 400: '#5680bb', 500: '#2c60aa',
          600: '#1e4d8c', 700: '#1e3a5f', 800: '#162b47', 900: '#0e1c2f',
          950: '#040d1a',
        },
        teal: {
          50:  '#f0fdfa', 100: '#ccfbf1', 150: '#b2f5ea', 200: '#99f6e4',
          300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6',
          600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a',
        },
        warm: {
          50:  '#faf9f7', 100: '#f5f3ef', 150: '#f0ece6', 200: '#ede9e3',
          300: '#ddd8cf', 400: '#c8c0b3', 500: '#b0a697',
          600: '#8f8377', 700: '#6b6159', 800: '#504840', 900: '#38312a',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 4px 24px -4px rgba(30,58,95,0.08)',
        'card-lg': '0 8px 40px -8px rgba(30,58,95,0.16)',
        'card-xl': '0 20px 60px -12px rgba(30,58,95,0.30)',
      },
    },
  },
  plugins: [],
}
