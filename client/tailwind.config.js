/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#0a0b10",
        obsidian: "#0e1017",
        neonPink: "#ff0055",
        neonCyan: "#00f0ff",
        neonGreen: "#39ff14",
        neonAmber: "#ffaa00",
        cyberSilver: "#cbd5e1",
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        mono: ["Share Tech Mono", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glowPink: "0 0 15px rgba(255, 0, 85, 0.5), inset 0 0 10px rgba(255, 0, 85, 0.2)",
        glowCyan: "0 0 15px rgba(0, 240, 255, 0.5), inset 0 0 10px rgba(0, 240, 255, 0.2)",
        glowGreen: "0 0 15px rgba(57, 255, 20, 0.5), inset 0 0 10px rgba(57, 255, 20, 0.2)",
        glowAmber: "0 0 15px rgba(255, 170, 0, 0.5), inset 0 0 10px rgba(255, 170, 0, 0.2)",
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        }
      }
    },
  },
  plugins: [],
}
