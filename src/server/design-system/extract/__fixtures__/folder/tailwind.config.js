module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#14b8a6', foreground: '#042f2e' },
        danger: 'rgb(220 38 38)',
        brand: require('./brand'),
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ["IBM Plex Mono", 'monospace'],
      },
      borderRadius: { lg: '14px', sm: '4px' },
    },
  },
};
