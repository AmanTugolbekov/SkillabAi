'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string };

const GUEST: Item[] = [
  { href: '/', label: 'Лента' },
  { href: '/ai', label: 'Спросить' },
  { href: '/my', label: 'Записи' },
  { href: '/profile', label: 'Профиль' },
];

const ORGANIZER: Item[] = [
  { href: '/organizer', label: 'События' },
  { href: '/organizer/new', label: 'Создать' },
  { href: '/organizer/kyc', label: 'Проверка' },
  { href: '/profile', label: 'Профиль' },
];

export default function BottomNav({ role }: { role: 'guest' | 'organizer' }) {
  const pathname = usePathname();
  // На страницах организатора показываем его меню, даже если роль ещё не
  // переключена: иначе переход по прямой ссылке выглядит сломанным.
  const organizerView = role === 'organizer' || pathname.startsWith('/organizer');
  const items = organizerView ? ORGANIZER : GUEST;

  return (
    <nav
      className="sticky bottom-0 z-30 bg-page px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5"
      style={{ borderTop: '2px solid var(--line)' }}
    >
      <ul className="flex gap-1.5">
        {items.map((item) => {
          const active =
            item.href === '/' || item.href === '/organizer'
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex items-center justify-center rounded-full py-2.5 text-[14px] font-bold"
                style={
                  active
                    ? {
                        background: 'var(--brand)',
                        color: 'var(--on-brand)',
                        border: '2px solid var(--line)',
                      }
                    : { color: 'var(--muted)', border: '2px solid transparent' }
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
