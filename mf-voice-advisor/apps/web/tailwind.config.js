/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-elevated': 'var(--bg-elevated)',
        'theme-text': 'var(--text-primary)',
        'theme-text-secondary': 'var(--text-secondary)',
        'theme-text-muted': 'var(--text-muted)',
        'theme-border': 'var(--border-color)',
        'theme-accent': 'var(--accent-primary)',
        'theme-accent-hover': 'var(--accent-primary-hover)',
        'theme-accent-soft': 'var(--accent-soft-bg)',
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
