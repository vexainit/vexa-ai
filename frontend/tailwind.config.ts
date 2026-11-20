import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vb: {
          canvas: '#F8F7F4',
          surface: '#FFFFFF',
          border: '#E5E2DC',
          ink: '#18181B',
          muted: '#52525B',
          teal: { DEFAULT: '#0F4C5C', dark: '#0B3945', tint: '#E6F1F3' },
          terracotta: { DEFAULT: '#C85A32', tint: '#FDF0EB' },
          verified: { DEFAULT: '#15803D', tint: '#DCFCE7' },
          revision: { DEFAULT: '#B45309', tint: '#FEF3C7' },
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['"DM Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"DejaVu Sans Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
