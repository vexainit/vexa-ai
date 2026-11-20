import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vb: {
          canvas: 'rgb(var(--vb-canvas-rgb) / <alpha-value>)',
          surface: 'rgb(var(--vb-surface-rgb) / <alpha-value>)',
          border: 'rgb(var(--vb-border-rgb) / <alpha-value>)',
          ink: 'rgb(var(--vb-ink-rgb) / <alpha-value>)',
          muted: 'rgb(var(--vb-muted-rgb) / <alpha-value>)',
          teal: {
            DEFAULT: 'rgb(var(--vb-teal-rgb) / <alpha-value>)',
            dark: 'rgb(var(--vb-teal-dark-rgb) / <alpha-value>)',
            tint: 'rgb(var(--vb-teal-tint-rgb) / <alpha-value>)',
          },
          terracotta: {
            DEFAULT: 'rgb(var(--vb-terracotta-rgb) / <alpha-value>)',
            tint: 'rgb(var(--vb-terracotta-tint-rgb) / <alpha-value>)',
          },
          verified: {
            DEFAULT: 'rgb(var(--vb-verified-rgb) / <alpha-value>)',
            tint: 'rgb(var(--vb-verified-tint-rgb) / <alpha-value>)',
          },
          revision: {
            DEFAULT: 'rgb(var(--vb-revision-rgb) / <alpha-value>)',
            tint: 'rgb(var(--vb-revision-tint-rgb) / <alpha-value>)',
          },
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
