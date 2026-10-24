import Link from 'next/link';
import { Capacity, KycBadge } from '@/components/Badges';
import { photoFor } from '@/lib/photo';
import { ensureOrganizer, listEvents, statsFor } from '@/lib/queries';
import { currentUser } from '@/lib/session';
import { formatDateTime, formatMoney, formatPrice } from '@/lib/format';

export default async function OrganizerPage() {
  const user = await currentUser();
  const organizer = ensureOrganizer(user.id);
  const stats = statsFor(organizer.id);
  const events = listEvents({ organizerId: organizer.id, limit: 50 });

  const verified = organizer.kyc_status === 'verified';

  return (
    <div className="px-5 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="t-display truncate">{organizer.display_name}</h1>
          <p className="t-small mt-1 text-muted">Панель организатора</p>
        </div>
        <KycBadge status={organizer.kyc_status} />
      </div>

      {!verified && (
        <Link
          href="/organizer/kyc"
          className="mt-4 block rounded-[20px] p-5"
          style={{ background: 'var(--warn-soft)' }}
        >
          <p className="t-section" style={{ color: 'var(--warn)' }}>
            {organizer.kyc_status === 'pending'
              ? 'Проверка документов идёт'
              : organizer.kyc_status === 'rejected'
                ? 'Проверка не пройдена'
                : 'Пройдите верификацию'}
          </p>
          <p className="t-small mt-1.5" style={{ color: 'var(--warn)' }}>
            {organizer.kyc_status === 'pending'
              ? 'Пока заявка на проверке, публиковать можно только бесплатные события.'
              : 'Без подтверждённой личности нельзя собирать взносы — участники не рискуют деньгами.'}
          </p>
          <p className="mt-3 text-[13.5px] font-bold" style={{ color: 'var(--warn)' }}>
            Открыть проверку →
          </p>
        </Link>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="События" value={String(stats.events)} />
        <Stat label="Участники" value={String(stats.attendees)} />
        <Stat label="Сборы" value={formatMoney(stats.revenue)} />
      </div>

      <Link href="/organizer/new" className="card mt-4 block">
        <div className="flex items-center gap-3.5 p-4">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-[14px] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            AI
          </span>
          <span className="min-w-0">
            <span className="t-section block">Создать событие из текста</span>
            <span className="t-small mt-0.5 block text-muted">
              Вставьте анонс как есть — разложим на программу, требования и дедлайны
            </span>
          </span>
        </div>
      </Link>

      <h2 className="t-title mb-3 mt-6">
        Мои события <span className="text-muted">· {events.length}</span>
      </h2>

      {events.length === 0 ? (
        <p className="card p-6 text-center text-[13.5px] text-muted">
          Событий пока нет. Начните с кнопки выше.
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/organizer/event/${event.id}`} className="card block p-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src={photoFor(event.id, event.category)}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-[12px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-bold">{event.title}</p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {formatDateTime(event.starts_at)} · {formatPrice(event.price)}
                    </p>
                  </div>
                </div>
                <div className="mt-3.5">
                  <Capacity taken={event.taken} capacity={event.capacity} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-4 text-center">
      <p className="text-[17px] font-extrabold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-2 text-[11.5px] text-muted">{label}</p>
    </div>
  );
}
