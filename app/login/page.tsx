import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signInAction } from '@/app/auth-actions';
import { AuthError, AuthShell, GoogleButton } from '@/components/AuthForm';
import { googleEnabled } from '@/lib/auth';
import { currentUser } from '@/lib/session';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = '/' } = await searchParams;
  if (await currentUser()) redirect(next);

  return (
    <AuthShell title="Вход" subtitle="Войдите, чтобы записываться на события и собирать свои.">
      <AuthError message={error} />

      <form action={signInAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="field-label">Почта</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="block">
          <span className="field-label">Пароль</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field"
          />
        </label>
        <button type="submit" className="btn-primary w-full">
          Войти
        </button>
      </form>

      <GoogleButton enabled={googleEnabled()} next={next} />

      <p className="mt-6 text-center text-[14px] text-muted">
        Нет аккаунта?{' '}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Зарегистрироваться
        </Link>
      </p>
    </AuthShell>
  );
}
