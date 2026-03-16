import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        med: {
          bg: "#f6f8fb",
          text: "#1f2937",
          primary: "#1f4f7a",
          accent: "#1b8a9b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
