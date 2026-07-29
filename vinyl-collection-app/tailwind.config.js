/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1F23',
        'ink-light': '#242A31',
        paper: '#E8DFC8',
        'paper-light': '#F1EAD9',
        mustard: '#C9A227',
        rust: '#A63D2F',
        teal: '#1F4B43',
        'ink-blue': '#2B3A55',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
