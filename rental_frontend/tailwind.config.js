/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fb",
          400: "#36aaf5",
          500: "#0c8fe1",
          600: "#0070bf",
          700: "#015999",
          800: "#064c7e",
          900: "#0b3f69",
          950: "#072847",
        },
        sand: {
          50:  "#faf8f5",
          100: "#f3ede4",
          200: "#e6d9c8",
          300: "#d4bfa1",
          400: "#c09f78",
          500: "#b0875a",
          600: "#9a7049",
          700: "#7f593d",
          800: "#694936",
          900: "#573d2f",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "sans-serif"],
      },
      borderRadius: {
        xl:  "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(0,0,0,0.08)",
        "card-hover": "0 8px 32px 0 rgba(0,0,0,0.14)",
        float: "0 4px 24px 0 rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
}
