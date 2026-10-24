import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/auth-actions';
import { AuthError, AuthShell, GoogleButton } from '@/components/AuthForm';
import { googleEnabled } from '@/lib/auth';
import { currentUser } from '@/lib/session';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = '/' } = await searchParams;
  if (await currentUser()) redirect(next);

  const thisYear = new Date().getFullYear();

  return (
    <AuthShell
      title="Регистрация"
      subtitle="Год рождения нужен для возрастных ограничений событий — без него не обойтись."
    >
      <AuthError message={error} />

      <form action={signUpAction} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="field-label">Как вас зовут</span>
          <input name="name" required minLength={2} autoComplete="name" className="field" />
        </label>
        <label className="block">
          <span className="field-label">Почта</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="field-label">Пароль</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>
          <label className="block">
            <span className="field-label">Год рождения</span>
            <input
              name="birth_year"
              type="number"
              required
              min={thisYear - 80}
              max={thisYear - 6}
              placeholder="2004"
              className="field"
            />
          </label>
        </div>
        <button type="submit" className="btn-primary w-full">
          Создать аккаунт
        </button>
      </form>

      <GoogleButton enabled={googleEnabled()} next={next} />

      <p className="mt-6 text-center text-[14px] text-muted">
        Уже есть аккаунт?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Войти
        </Link>
      </p>
    </AuthShell>
  );
}
