import type { Config } from 'tailwindcss';

/** Цвета живут в CSS-переменных (app/globals.css), поэтому одна разметка
 *  обслуживает светлую и тёмную тему. Ключ `ink` вместо `text`: с ключом
 *  `text` Tailwind путает цвет и размер шрифта. */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        line: 'var(--line)',
        ink: 'var(--text)',
        'ink-soft': 'var(--text-soft)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
      },
      fontFamily: { sans: ['var(--font-sans)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
