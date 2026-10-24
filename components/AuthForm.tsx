import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 pb-8 pt-8">
      <Link href="/" className="text-[13px] text-muted">
        ← к афише
      </Link>
      <h1 className="t-display mt-4">{title}</h1>
      <p className="t-small mt-2 text-muted">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="mb-4 rounded-[12px] px-3.5 py-3 text-[13.5px]"
      style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
    >
      {message}
    </p>
  );
}

/** Кнопка Google появляется, только когда ключи заданы в окружении. */
export function GoogleButton({ enabled, next }: { enabled: boolean; next: string }) {
  if (!enabled) {
    return (
      <p className="mt-4 rounded-[12px] bg-raised px-3.5 py-3 text-[12.5px] leading-snug text-muted">
        Вход через Google появится, когда в окружении будут ключи
        <code className="mx-1">GOOGLE_CLIENT_ID</code>и
        <code className="mx-1">GOOGLE_CLIENT_SECRET</code>.
      </p>
    );
  }

  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      className="btn-secondary mt-4 w-full gap-3"
    >
      <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
        <path fill="#4285F4" d="M45 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.7 5.2c4-3.7 6.7-9.1 6.7-15z" />
        <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.9l7.1-5.5z" />
        <path fill="#EA4335" d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6.1-6C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.3 12.5-9.3z" />
      </svg>
      Продолжить с Google
    </a>
  );
}
