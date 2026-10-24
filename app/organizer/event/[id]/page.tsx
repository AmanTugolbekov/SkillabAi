import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Capacity, Pill } from '@/components/Badges';
import { ageOf, attendeesOf, getEvent } from '@/lib/queries';
import { photoFor } from '@/lib/photo';
import Avatar from '@/components/Avatar';
import { ageText, formatDateTime, formatMoney, formatPrice } from '@/lib/format';

/** Список участников события — то, что организатор открывает на входе. */
export default async function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = getEvent(Number(id));
  if (!event) notFound();

  const attendees = attendeesOf(event.id);
  const confirmed = attendees.filter((a) => a.status === 'confirmed');
  const waiting = attendees.filter((a) => a.status === 'awaiting_parent');

  return (
    <div className="px-5 pt-5">
      <Link href="/organizer" className="text-[13px] font-medium text-muted">
        ← к моим событиям
      </Link>

      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <img
            src={photoFor(event.id, event.category)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-[12px] object-cover"
          />
          <div className="min-w-0">
            <h1 className="t-section line-clamp-2">{event.title}</h1>
            <p className="mt-1 text-[12.5px] text-muted">
              {formatDateTime(event.starts_at)} · {formatPrice(event.price)}
            </p>
          </div>
        </div>
        <div className="border-t border-line p-5">
          <Capacity taken={event.taken} capacity={event.capacity} />
          <p className="mt-3 text-[13px] text-muted">
            Ожидаемые сборы:{' '}
            <span className="font-bold text-ink">{formatMoney(confirmed.length * event.price)}</span>
          </p>
        </div>
      </div>

      <h2 className="t-title mb-3 mt-6">
        Подтверждённые <span className="text-muted">· {confirmed.length}</span>
      </h2>
      {confirmed.length === 0 ? (
        <p className="card p-6 text-center text-[13.5px] text-muted">Пока никто не записался.</p>
      ) : (
        <ul className="space-y-2">
          {confirmed.map((a) => (
            <li key={a.id} className="card-quiet flex items-center gap-3 px-4 py-3">
              <Avatar name={a.name} size={36} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{a.name}</span>
              <span className="text-[12.5px] text-muted">{ageText(ageOf(a))}</span>
            </li>
          ))}
        </ul>
      )}

      {waiting.length > 0 && (
        <>
          <h2 className="t-title mb-3 mt-6">
            Ждут родителя <span className="text-muted">· {waiting.length}</span>
          </h2>
          <ul className="space-y-2">
            {waiting.map((a) => (
              <li
                key={a.id}
                className="card-quiet flex items-center gap-3 px-4 py-3"
                style={{ borderColor: 'var(--warn)' }}
              >
                <Avatar name={a.name} size={36} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{a.name}</span>
                <Pill tone="warn">не подтверждён</Pill>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] leading-snug text-muted">
            Эти участники младше 13 лет и записались сами. Пока родитель не подтвердит заявку, место
            не считается занятым.
          </p>
        </>
      )}
    </div>
  );
}
