import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-dark": "#2a2a2a",
        "brand-yellow": "#D4FF00",
        "brand-blue-gray": "#7A90A2",
        "brand-blue-gray-light": "#8BA2B4",
        "ref-dark": "#2a2a2a",
        "ref-accent": "#d6ee52",
        "ref-accent-hover": "#c5e128",
        "ref-panel": "#a2b4c1",
        "ref-panel-dark": "#8a9ba7",
        "primary": "#000000",
        "primary-container": "#ff5f38",
        "on-primary": "#ffffff",
        "on-primary-container": "#5c0f00",
        "secondary": "#5e3bdb",
        "secondary-container": "#7858f5",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "tertiary": "#000000",
        "tertiary-container": "#191e00",
        "tertiary-fixed": "#d6ee52",
        "surface": "#f8f9fc",
        "surface-bright": "#ffffff",
        "surface-dim": "#d9dadd",
        "surface-container": "#edeef1",
        "surface-container-low": "#f2f3f6",
        "surface-container-high": "#e7e8eb",
        "surface-container-highest": "#e1e2e5",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#e1e2e5",
        "on-surface": "#191c1e",
        "on-surface-variant": "#444748",
        "outline": "#747878",
        "outline-variant": "#c4c7c7",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "background": "#f8f9fc",
        "on-background": "#191c1e",
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1.5rem",
        "3xl": "2.5rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "1.5rem",
        "card-gap": "2rem",
        "container-padding": "4rem",
        "section-margin": "3rem",
        "margin-desktop": "64px",
        "container-max": "1440px",
        "margin-mobile": "20px",
        "section-gap": "80px"
      }
    },
  },
  plugins: [],
};
export default config;
