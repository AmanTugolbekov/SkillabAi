import Link from 'next/link';
import { cancelRegistrationAction, confirmRegistrationAction } from '@/app/actions';
import { Pill } from '@/components/Badges';
import Avatar from '@/components/Avatar';
import { photoFor } from '@/lib/photo';
import { ageOf, awaitingParent, childrenOf, isChildAccount, registrationsFor } from '@/lib/queries';
import { currentUser } from '@/lib/session';
import { ageText, formatDateTime, formatPrice } from '@/lib/format';

export default async function MyPage() {
  const user = await currentUser();
  const registrations = registrationsFor(user.id);
  const kids = childrenOf(user.id);
  const waiting = awaitingParent(user.id);

  const upcoming = registrations.filter((r) => r.status !== 'cancelled');
  const mine = upcoming.filter((r) => r.attendee_id === user.id);
  const forKids = upcoming.filter((r) => r.attendee_id !== user.id);

  return (
    <div className="px-5 pt-5">
      <h1 className="t-display">Мои записи</h1>
      <p className="t-small mt-2 text-muted">
        {isChildAccount(user)
          ? 'Это детский профиль: новые заявки подтверждает родитель.'
          : kids.length > 0
            ? 'Ваши записи и записи детей в одном списке.'
            : 'Всё, на что вы записались.'}
      </p>

      {/* Родительский контроль — заявки детей, которые ждут решения. */}
      {waiting.length > 0 && (
        <section
          className="mt-5 rounded-[20px] p-5"
          style={{ background: 'var(--warn-soft)' }}
        >
          <h2 className="t-section" style={{ color: 'var(--warn)' }}>
            Нужно ваше решение · {waiting.length}
          </h2>
          <p className="t-small mt-1.5" style={{ color: 'var(--warn)' }}>
            Ребёнок записался сам. Пока вы не подтвердите, место за ним не закреплено.
          </p>
          <ul className="mt-4 space-y-3">
            {waiting.map((r) => (
              <li key={r.id} className="rounded-2xl bg-surface p-4">
                <p className="t-small font-bold">{r.title}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {r.attendee_name} · {formatDateTime(r.starts_at)} · {formatPrice(r.price)}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">{r.venue || r.district}</p>
                <div className="mt-3.5 flex gap-2">
                  <form action={confirmRegistrationAction} className="flex-1">
                    <input type="hidden" name="registration_id" value={r.id} />
                    <button type="submit" className="btn-primary w-full px-4 py-2.5 text-[14px]">
                      Разрешить
                    </button>
                  </form>
                  <form action={cancelRegistrationAction}>
                    <input type="hidden" name="registration_id" value={r.id} />
                    <button
                      type="submit"
                      className="btn-secondary px-4 py-2.5 text-[14px]"
                      style={{ color: 'var(--bad)' }}
                    >
                      Отклонить
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RegList title="Я участвую" items={mine} emptyText="Вы ещё никуда не записались." />

      {kids.length > 0 && (
        <RegList title="Дети" items={forKids} emptyText="Для детей пока ничего не записано." showAttendee />
      )}

      {kids.length > 0 && (
        <section className="card mt-6 p-5">
          <h2 className="t-section">Детские профили</h2>
          <p className="t-small mt-1.5 text-muted">
            Профили младше 13 лет создаёт и ведёт родитель: своих заявок ребёнок не подтверждает и
            не видит чужих контактов.
          </p>
          <ul className="mt-3.5 space-y-2">
            {kids.map((k) => (
              <li key={k.id} className="flex items-center gap-3 rounded-2xl bg-raised px-4 py-3">
                <Avatar name={k.name} size={36} />
                <span className="flex-1 text-[14px] font-medium">{k.name}</span>
                <span className="text-[12.5px] text-muted">{ageText(ageOf(k))}</span>
                {ageOf(k) < 13 && <Pill tone="ok">под контролем</Pill>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type Item = Awaited<ReturnType<typeof registrationsFor>>[number];

function RegList({
  title,
  items,
  emptyText,
  showAttendee = false,
}: {
  title: string;
  items: Item[];
  emptyText: string;
  showAttendee?: boolean;
}) {
  return (
    <section className="mt-6">
      <h2 className="t-title mb-3">
        {title} <span className="text-muted">· {items.length}</span>
      </h2>
      {items.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="t-small text-muted">{emptyText}</p>
          <Link href="/" className="btn-secondary mt-3.5 px-5 py-2.5 text-[14px]">
            Открыть ленту
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Link href={`/event/${r.event_id}`} className="card flex items-stretch overflow-hidden">
                <img
                  src={photoFor(r.event_id, 'club')}
                  alt=""
                  loading="lazy"
                  className="w-[88px] shrink-0 object-cover"
                />
                <span className="min-w-0 flex-1 p-4">
                  <span className="block truncate text-[14.5px] font-bold">{r.title}</span>
                  <span className="mt-1 block text-[12.5px] text-muted">
                    {formatDateTime(r.starts_at)} · {formatPrice(r.price)}
                  </span>
                  {showAttendee && (
                    <span className="mt-0.5 block text-[12.5px] text-muted">
                      участник: {r.attendee_name}
                    </span>
                  )}
                  <span className="mt-2 block">
                    {r.status === 'awaiting_parent' ? (
                      <Pill tone="warn">ждёт родителя</Pill>
                    ) : (
                      <Pill tone="ok">подтверждено</Pill>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
