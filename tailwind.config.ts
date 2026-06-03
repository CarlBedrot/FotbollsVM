import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1c22',
        cream: '#fdeecf',
        paper: '#fffaf0',
        vmred: '#e23b3b',
        vmblue: '#2b5fd0',
        vmgreen: '#1b9e5a',
        gold: '#f5b833',
      },
      boxShadow: {
        hard: '6px 6px 0 #1c1c22',
      },
    },
  },
  plugins: [],
};
export default config;
