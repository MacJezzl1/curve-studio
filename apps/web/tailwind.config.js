/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080c14",
        surface: "#0e1524",
        "surface-card": "#131b2e",
        "surface-border": "#1e2942",
        brand: {
          50: "#e6fbff",
          100: "#c0f6fe",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          meteora: "#00E5FF",
        },
        accent: {
          green: "#10b981",
          purple: "#a855f7",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
