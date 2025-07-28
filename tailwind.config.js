/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // ADDED: Custom keyframes and animation for Tailwind
      keyframes: {
        pulsePin: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
        }
      },
      animation: {
        'pulse-pin': 'pulsePin 1.5s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}
