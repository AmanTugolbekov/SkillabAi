import Link from 'next/link';
import { switchRoleAction } from '@/app/actions';
import { addChildAction, removeChildAction, signOutAction } from '@/app/auth-actions';
import { KycBadge, Pill } from '@/components/Badges';
import Avatar from '@/components/Avatar';
import { AuthError } from '@/components/AuthForm';
import { ageOf, childrenOf, organizerOf } from '@/lib/queries';
import { aiEnabled } from '@/lib/ai';
import { isShared } from '@/lib/db';
import { googleEnabled } from '@/lib/auth';
import { currentRole, requireUser } from '@/lib/session';
import { ageText } from '@/lib/format';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [user, role] = await Promise.all([requireUser('/profile'), currentRole()]);
  const [organizer, kids] = await Promise.all([organizerOf(user.id), childrenOf(user.id)]);

  const thisYear = new Date().getFullYear();

  return (
    <div className="px-4 pt-5">
      <AuthError message={error} />

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div className="min-w-0">
            <p className="t-title truncate">{user.name}</p>
            <p className="t-small mt-0.5 truncate text-muted">{user.email}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {ageText(ageOf(user))} · {user.city}
              {user.google_sub && ' · вход через Google'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-raised p-1">
          <form action={switchRoleAction}>
            <input type="hidden" name="role" value="guest" />
            <button
              type="submit"
              className="w-full rounded-full py-2.5 text-[13.5px] font-semibold transition-colors"
              style={
                role === 'guest'
                  ? { background: 'var(--surface)', color: 'var(--text)' }
                  : { color: 'var(--muted)' }
              }
            >
              Участник
            </button>
          </form>
          <form action={switchRoleAction}>
            <input type="hidden" name="role" value="organizer" />
            <button
              type="submit"
              className="w-full rounded-full py-2.5 text-[13.5px] font-semibold transition-colors"
              style={
                role === 'organizer'
                  ? { background: 'var(--surface)', color: 'var(--text)' }
                  : { color: 'var(--muted)' }
              }
            >
              Организатор
            </button>
          </form>
        </div>
      </div>

      {organizer && (
        <Link href="/organizer/kyc" className="card mt-3 flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="t-small font-bold">Профиль организатора</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">{organizer.display_name}</p>
          </div>
          <KycBadge status={organizer.kyc_status} />
        </Link>
      )}

      {/* Детские профили: своего входа у ребёнка нет, его ведёт родитель. */}
      <section className="mt-6">
        <h2 className="t-title">Детские профили</h2>
        <p className="t-small mt-1.5 text-muted">
          Ребёнок младше 13 лет не заводит отдельный аккаунт. Вы добавляете его здесь и
          подтверждаете каждую запись.
        </p>

        {kids.length > 0 && (
          <ul className="mt-3.5 space-y-2">
            {kids.map((kid) => (
              <li key={kid.id} className="card-quiet flex items-center gap-3 px-4 py-3">
                <Avatar name={kid.name} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{kid.name}</span>
                  <span className="block text-[12.5px] text-muted">{ageText(ageOf(kid))}</span>
                </span>
                {ageOf(kid) < 13 && <Pill tone="ok">под контролем</Pill>}
                <form action={removeChildAction}>
                  <input type="hidden" name="child_id" value={kid.id} />
                  <button
                    type="submit"
                    className="px-1 text-[18px] leading-none text-muted"
                    aria-label={`Удалить профиль ${kid.name}`}
                    title="Удалить профиль"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addChildAction} className="card-quiet mt-3 space-y-2.5 p-4">
          <p className="t-small font-semibold">Добавить ребёнка</p>
          <div className="flex gap-2">
            <input
              name="child_name"
              placeholder="Имя"
              required
              minLength={2}
              className="field flex-1"
            />
            <input
              name="child_birth_year"
              type="number"
              placeholder="год"
              required
              min={thisYear - 18}
              max={thisYear - 5}
              className="field w-[92px]"
            />
          </div>
          <button type="submit" className="btn-secondary w-full py-2.5 text-[14px]">
            Добавить
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        <Link href="/admin" className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="t-small font-bold">Модерация организаторов</p>
            <p className="mt-0.5 text-[12.5px] text-muted">Служебный экран проверки документов</p>
          </div>
          <span className="text-muted">→</span>
        </Link>

        <div className="card p-4">
          <p className="t-small font-bold">Состояние сервисов</p>
          <ul className="mt-2.5 space-y-2 text-[12.5px]">
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">База данных</span>
              <Pill tone={isShared() ? 'ok' : 'neutral'}>
                {isShared() ? 'Turso, общая' : 'локальный файл'}
              </Pill>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">AI-движок</span>
              <Pill tone={aiEnabled() ? 'ok' : 'warn'}>
                {aiEnabled() ? 'Claude' : 'встроенные правила'}
              </Pill>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">Вход через Google</span>
              <Pill tone={googleEnabled() ? 'ok' : 'warn'}>
                {googleEnabled() ? 'подключён' : 'ключи не заданы'}
              </Pill>
            </li>
          </ul>
        </div>

        <form action={signOutAction}>
          <button type="submit" className="btn-secondary w-full" style={{ color: 'var(--bad)' }}>
            Выйти из аккаунта
          </button>
        </form>
      </section>
    </div>
  );
}
