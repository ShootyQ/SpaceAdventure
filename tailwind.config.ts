import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: "#0b0d17",
          800: "#151932",
          700: "#1f264e",
          accent: "#d0d6f9",
          highlight: "#ffffff",
        },
        primary: "#0b0d17", // Deep space black/blue
        secondary: "#151932", // Lighter space blue
        accent: "#38bdf8", // Cyan/Blue for tech UI
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "conic-gradient":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "spin-slow": "spin 20s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        twinkle: {
            "0%, 100%": { opacity: "1" },
            "50%": { opacity: "0.3" },
        }
      },
    },
  },
  plugins: [],
};
export default config;
