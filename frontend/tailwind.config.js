/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic palette — resolved by CSS custom properties so they
        // automatically flip between dark and light themes.
        background:      'var(--c-bg)',
        paper:           'var(--c-paper)',
        surface:         'var(--c-surface)',
        surfaceLight:    'var(--c-surface-lt)',
        surfaceHighlight:'var(--c-surface-hl)',
        border:          'var(--c-border)',
        borderLight:     'var(--c-border-lt)',
        borderSubtle:    'var(--c-surface)',
        ink:             'var(--c-ink)',
        muted:           'var(--c-muted)',
        mutedLight:      'var(--c-muted-lt)',
        accent: {
          DEFAULT: 'var(--c-accent)',
          light:   'rgba(0, 0, 0, 0.05)',
          dark:    'var(--c-accent-hover)',
          glow:    'rgba(0, 0, 0, 0.06)',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow:    '0 0 25px -5px rgba(0,0,0,0.08)',
        'glow-sm':'0 0 15px -3px rgba(0,0,0,0.05)',
        card:    '0 4px 24px -2px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
