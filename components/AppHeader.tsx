import Link from 'next/link';
import { switchRoleAction } from '@/app/actions';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';

type Props = {
  role: 'guest' | 'organizer';
  theme: 'light' | 'dark' | null;
  userName: string | null;
  isChild: boolean;
};

export default function AppHeader({ role, theme, userName, isChild }: Props) {
  const organizerMode = role === 'organizer';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/95 px-4 pb-2.5 pt-3.5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <Link href={organizerMode ? '/organizer' : '/'} className="flex items-baseline gap-2">
          <span
            className="text-[19px] font-bold leading-none tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            EventSphere
          </span>
          {organizerMode && (
            <span className="t-caps" style={{ color: 'var(--accent)' }}>
              организатор
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle saved={theme} />
          {userName ? (
            <Link href="/profile" aria-label="Профиль">
              <Avatar name={userName} size={34} />
            </Link>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              Войти
            </Link>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {userName && (
          <form action={switchRoleAction}>
            <input type="hidden" name="role" value={organizerMode ? 'guest' : 'organizer'} />
            <button type="submit" className="chip">
              {organizerMode ? 'Вернуться к афише' : 'Я организатор'}
            </button>
          </form>
        )}
        {isChild && (
          <span className="badge" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
            детский профиль
          </span>
        )}
      </div>
    </header>
  );
}
