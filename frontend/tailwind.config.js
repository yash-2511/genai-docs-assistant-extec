/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'monospace'],
      },
      colors: {
        shell: '#101010',
        panel: '#1a1a1a',
        panelSoft: '#222222',
        panelLift: '#2b2b2b',
        accent: '#f97316',
        accentSoft: '#fb923c',
        border: 'rgba(255,255,255,0.08)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 22px 55px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        pulseDots: {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseDots: 'pulseDots 1.1s infinite ease-in-out',
        fadeUp: 'fadeUp 180ms ease-out',
      },
    },
  },
  plugins: [],
}