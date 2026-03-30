import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bone palette — used site-wide for warm, calm aesthetic
        bone: {
          DEFAULT: "#F9F8F6",  // base background
          panel:   "#F1EFE9",  // secondary panels / recessed surfaces
        },
        ink: "#211C18",        // primary text / deep anchor
        divide: "#E5E2DA",     // borders / quiet dividers
      },
    },
  },
  plugins: [],
};

export default config;
