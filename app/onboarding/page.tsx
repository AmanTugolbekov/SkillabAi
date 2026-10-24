import { redirect } from 'next/navigation';
import { completeProfileAction } from '@/app/auth-actions';
import { AuthError, AuthShell } from '@/components/AuthForm';
import { requireUser } from '@/lib/session';

/** Google не отдаёт дату рождения, а возрастные ограничения без неё не работают. */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  if (user.birth_year) redirect('/');

  const thisYear = new Date().getFullYear();

  return (
    <AuthShell
      title={`Рады видеть, ${user.name.split(' ')[0]}`}
      subtitle="Остался один вопрос: в каком году вы родились? Это нужно, чтобы показывать события по возрасту."
    >
      <AuthError message={error} />
      <form action={completeProfileAction} className="space-y-3">
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
        <button type="submit" className="btn-primary w-full">
          Готово
        </button>
      </form>
    </AuthShell>
  );
}
