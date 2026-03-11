/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scanner tous les fichiers susceptibles d'utiliser des classes Tailwind
  content: [
    './index.html',
    './js/**/*.js',
    './css/style.css',
  ],
  theme: {
    extend: {
      colors: {
        ink:      '#0a0b14',
        surface:  '#141628',
        raised:   '#1c1f38',
        lborder:  '#2a2f55',
        gold:     { DEFAULT: '#c9a84c', light: '#f0cc6e' },
        amethyst: '#9b59b6',
        sapphire: '#3498db',
        ruby:     '#e74c3c',
        emerald:  '#2ecc71',
        win:      '#4ecca3',
        loss:     '#e85d7a',
        ltext:    '#d4c9f0',
        muted:    '#7a7fa0',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        body:    ['Crimson Pro', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
