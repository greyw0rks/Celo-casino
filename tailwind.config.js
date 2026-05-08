/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          bg: "#080810",
          surface: "#0F0F1A",
          card: "#141428",
          border: "#1E1E3A",
          gold: "#F5C542",
          "gold-dim": "#C9A227",
          neon: "#00FF87",
          "neon-dim": "#00CC6A",
          red: "#FF4444",
          blue: "#4488FF",
          purple: "#8B5CF6",
          text: "#E8E8F0",
          muted: "#6B6B8A",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "monospace"],
        mono: ["'Space Mono'", "monospace"],
        body: ["'Outfit'", "sans-serif"],
      },
      animation: {
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "crash-line": "crashLine 0.1s linear",
        "card-flip": "cardFlip 0.4s ease-in-out",
        "glow": "glow 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        pulseGold: {
          "0%, 100%": { textShadow: "0 0 10px #F5C542, 0 0 20px #F5C542" },
          "50%": { textShadow: "0 0 20px #F5C542, 0 0 40px #F5C542, 0 0 60px #F5C542" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 20px currentColor, 0 0 40px currentColor" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        cardFlip: {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
      },
      backgroundImage: {
        "felt": "radial-gradient(ellipse at center, #1a3a2a 0%, #0d1f16 100%)",
        "casino-grid": "linear-gradient(rgba(245,197,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,66,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
