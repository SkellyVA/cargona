/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0C10',
        surface: {
          DEFAULT: '#13151B',
          elevated: '#181B23',
          border: 'rgba(255, 255, 255, 0.07)',
          subtle: 'rgba(255, 255, 255, 0.03)',
        },
        accent: {
          blue: '#2F80ED',
          cyan: '#38BDF8',
          emerald: '#10B981',
          amber: '#F59E0B',
          coral: '#EB5757',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8E95A5',
          tertiary: '#4E5566',
        }
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        'glow-blue': '0 0 25px -4px rgba(47, 128, 237, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(56, 189, 248, 0.35)',
        'card': '0 8px 30px -4px rgba(0, 0, 0, 0.6)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
