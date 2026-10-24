import Link from 'next/link';
import { switchRoleAction, switchUserAction } from '@/app/actions';
import { KycBadge, Pill } from '@/components/Badges';
import Avatar from '@/components/Avatar';
import { ageOf, childrenOf, demoUsers, organizerOf } from '@/lib/queries';
import { aiEnabled } from '@/lib/ai';
import { currentRole, currentUser } from '@/lib/session';
import { ageText } from '@/lib/format';

export default async function ProfilePage() {
  const [user, role] = await Promise.all([currentUser(), currentRole()]);
  const accounts = demoUsers();
  const organizer = organizerOf(user.id);
  const kids = childrenOf(user.id);

  return (
    <div className="px-5 pt-5">
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div className="min-w-0">
            <p className="t-title truncate">{user.name}</p>
            <p className="t-small mt-0.5 text-muted">
              {ageText(ageOf(user))} · {user.city}
              {kids.length > 0 && ` · ${kids.length} детских профиля`}
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
                  ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-card)' }
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
                  ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-card)' }
                  : { color: 'var(--muted)' }
              }
            >
              Организатор
            </button>
          </form>
        </div>
      </div>

      {organizer && (
        <Link href="/organizer/kyc" className="card mt-4 flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="t-small font-bold">Профиль организатора</p>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">{organizer.display_name}</p>
          </div>
          <KycBadge status={organizer.kyc_status} />
        </Link>
      )}

      {/* Переключатель аккаунтов: без него не показать родительский режим. */}
      <section className="mt-6">
        <h2 className="t-title">Аккаунт для демонстрации</h2>
        <p className="t-small mt-1.5 text-muted">
          Авторизации в прототипе нет: переключитесь между участником, родителем и детским
          профилем, чтобы увидеть разные сценарии.
        </p>
        <ul className="mt-3.5 space-y-2">
          {accounts.map((a) => (
            <li key={a.id}>
              <form action={switchUserAction}>
                <input type="hidden" name="user_id" value={a.id} />
                <button
                  type="submit"
                  className="card-quiet flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
                  style={a.id === user.id ? { borderColor: 'var(--accent)' } : undefined}
                >
                  <Avatar name={a.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{a.name}</span>
                    <span className="block text-[12.5px] text-muted">
                      {ageText(ageOf(a))}
                      {a.children > 0 && ` · родитель (${a.children})`}
                      {a.parent_id && ' · детский профиль'}
                    </span>
                  </span>
                  {a.id === user.id && <Pill tone="accent">активен</Pill>}
                </button>
              </form>
            </li>
          ))}
        </ul>
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
          <div className="flex items-center justify-between gap-3">
            <p className="t-small font-bold">AI-движок</p>
            <Pill tone={aiEnabled() ? 'ok' : 'warn'}>
              {aiEnabled() ? 'Claude подключён' : 'встроенные правила'}
            </Pill>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-muted">
            {aiEnabled()
              ? 'Структуризация анонсов и разбор поисковых запросов идут через Claude.'
              : 'Ключ ANTHROPIC_API_KEY не задан — работают встроенные правила разбора текста. Добавьте ключ в .env.local, и те же экраны начнут работать через Claude без изменений в коде.'}
          </p>
        </div>
      </section>
    </div>
  );
}
