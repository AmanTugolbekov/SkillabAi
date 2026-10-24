import Link from 'next/link';

const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Полоса дат под шапкой — приём из ticket.kg: быстрый выбор дня вместо
 * календаря. Ссылки обычные, поэтому работает и без JavaScript.
 */
export default function DateStrip({
  selected,
  hrefFor,
  days = 21,
}: {
  selected?: string;
  hrefFor: (date: string) => string;
  days?: number;
}) {
  const today = new Date();
  const items = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
      <Link
        href={hrefFor('')}
        className={`flex h-[58px] shrink-0 items-center rounded-[12px] border px-3.5 text-[13px] font-semibold transition-colors ${
          selected ? 'border-line bg-surface text-ink-soft' : 'border-transparent'
        }`}
        style={!selected ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined}
      >
        Все дни
      </Link>
      {items.map((d, i) => {
        const value = iso(d);
        const active = selected === value;
        const isFirstOfMonth = d.getDate() === 1 || i === 0;
        return (
          <Link
            key={value}
            href={hrefFor(value)}
            className={`flex h-[58px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[12px] border transition-colors ${
              active ? 'border-transparent' : 'border-line bg-surface'
            }`}
            style={active ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined}
          >
            <span className={`text-[11px] ${active ? '' : 'text-muted'}`}>{DAYS[d.getDay()]}</span>
            <span className="text-[17px] font-bold leading-tight">{d.getDate()}</span>
            {isFirstOfMonth && (
              <span className={`text-[10px] ${active ? '' : 'text-muted'}`}>{MONTHS[d.getMonth()]}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
