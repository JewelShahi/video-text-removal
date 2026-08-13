import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        cinema: {
          "primary": "#7c5cff",
          "secondary": "#22d3ee",
          "accent": "#22d3ee",
          "neutral": "#12121a",
          "base-100": "#15151f",
          "base-200": "#0f0f17",
          "base-300": "#0a0a0f",
          "info": "#38bdf8",
          "success": "#4ade80",
          "warning": "#facc15",
          "error": "#fb7185",
        },
      },
      "night", "dracula", // extra dark themes to try instantly by swapping data-theme
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
      },
    },
  },
};
