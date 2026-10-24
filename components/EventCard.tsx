import Link from 'next/link';
import type { EventCard as EventCardType } from '@/lib/types';
import { photoFor } from '@/lib/photo';
import { deadlineLabel, formatDateTime, formatPrice } from '@/lib/format';

/**
 * Компактная карточка для сетки в две колонки — как на афишных сайтах:
 * снимок, цена поверх него, дата, название, место.
 */
export default function EventCard({ event }: { event: EventCardType }) {
  const deadline = deadlineLabel(event.deadline_at);
  const full = event.capacity > 0 && event.taken >= event.capacity;
  const flag = full ? 'мест нет' : deadline?.urgent ? deadline.text : null;

  return (
    <Link href={`/event/${event.id}`} className="card flex h-full flex-col">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-raised">
        <img
          src={photoFor(event.id, event.category)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="scrim absolute inset-0" />

        {/* Срочность — сверху, цена — снизу: на узкой карточке они не
            налезают друг на друга. Метку «выбор редакции» в сетке не
            показываем, её роль выполняет баннер в начале ленты. */}
        {flag && (
          <span className="badge absolute right-2 top-2 bg-white/90 text-[10.5px] text-[color:#0f1014]">
            {flag}
          </span>
        )}

        <span className="absolute bottom-2 left-2.5 right-2 truncate text-[13.5px] font-bold text-white">
          {event.price === 0 ? 'Бесплатно' : `от ${formatPrice(event.price)}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--accent)' }}>
          {formatDateTime(event.starts_at)}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-[14.5px] font-bold leading-[1.25]">{event.title}</h3>
        <p className="mt-auto pt-2 line-clamp-1 text-[12px] text-muted">
          {event.venue || event.district}
        </p>
      </div>
    </Link>
  );
}
