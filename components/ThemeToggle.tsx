'use client';

import { useEffect, useState } from 'react';
import { toggleThemeAction } from '@/app/actions';

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M20 13.5A8.2 8.2 0 0 1 10.5 4a8.3 8.3 0 1 0 9.5 9.5Z" />
    </svg>
  );
}

/**
 * Если пользователь ещё не выбирал тему (cookie пустой), сервер не знает,
 * какая она сейчас, — определяем системную настройку на клиенте, чтобы
 * кнопка предлагала действительно противоположную тему.
 */
export default function ThemeToggle({ saved }: { saved: 'light' | 'dark' | null }) {
  const [resolved, setResolved] = useState<'light' | 'dark'>(saved ?? 'light');

  useEffect(() => {
    if (saved) {
      setResolved(saved);
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setResolved(query.matches ? 'dark' : 'light');
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [saved]);

  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <form action={toggleThemeAction}>
      <input type="hidden" name="theme" value={next} />
      <button
        type="submit"
        aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-raised"
      >
        {resolved === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </form>
  );
}
