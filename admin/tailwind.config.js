/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        al: {
          navy: '#1E3A5F',
          'navy-dark': '#162D4A',
          orange: '#f5853b',
          'orange-light': '#FED7AA',
          blue: '#4781bf',
          'blue-light': '#DBEAFE',
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          'border-light': '#EDF2F7',
          'text-primary': '#2D3748',
          'text-secondary': '#718096',
          'text-muted': '#A0AEC0',
          success: '#48BB78',
          'success-light': '#C6F6D5',
          warning: '#F5A623',
          error: '#E53E3E',
          'error-bg': '#FFF5F5',
          'required-bg': '#FFEEDD',
        }
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'drawer': '-4px 0 20px rgba(0, 0, 0, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05)',
      }
    }
  },
  plugins: [],
}

