/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EFEAE0",
        "paper-dim": "#E6E0D2",
        ink: "#221F1A",
        "ink-soft": "#55504A",
        rule: "#C9C0AA",
        navy: "#2B3A55",
        stampRed: "#9C2B20",
        stampGreen: "#2F5233",
        mustard: "#B9862E",
      },
      fontFamily: {
        serif: ['"Fraunces"', "serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
        sans: ['"Work Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};