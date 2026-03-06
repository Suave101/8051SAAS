import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  // Add daisyUI here
  plugins: [require("daisyui")],
  
  // Optional: Force a dark theme
  daisyui: {
    themes: ["dracula"], 
  },
};

export default config;
