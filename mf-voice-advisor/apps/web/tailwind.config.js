/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
