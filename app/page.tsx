import Link from 'next/link';
import EventCard from '@/components/EventCard';
import DateStrip from '@/components/DateStrip';
import { listEvents } from '@/lib/queries';
import { photoFor } from '@/lib/photo';
import { CATEGORIES, DISTRICTS, categoryLabel } from '@/lib/types';
import { formatDateTime, formatPrice } from '@/lib/format';

type Search = {
  q?: string;
  cat?: string;
  district?: string;
  price?: string;
  age?: string;
  verified?: string;
  date?: string;
};

const PRICE_OPTIONS = [
  { value: '', label: 'Любая цена' },
  { value: 'free', label: 'Бесплатно' },
  { value: '500', label: 'до 500 сом' },
  { value: '1000', label: 'до 1000 сом' },
  { value: '3000', label: 'до 3000 сом' },
];

export default async function FeedPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;

  const events = listEvents({
    q: sp.q,
    categories: sp.cat ? [sp.cat] : undefined,
    districts: sp.district ? [sp.district] : undefined,
    freeOnly: sp.price === 'free',
    maxPrice: sp.price && sp.price !== 'free' ? Number(sp.price) : null,
    age: sp.age ? Number(sp.age) : null,
    verifiedOnly: sp.verified === '1',
    dateFrom: sp.date ?? null,
    dateTo: sp.date ?? null,
  });

  const withParam = (key: keyof Search, value: string) => {
    const params = new URLSearchParams(sp as Record<string, string>);
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const chipHref = (cat: string) => withParam('cat', sp.cat === cat ? '' : cat);

  const filtersUsed = [sp.q, sp.district, sp.price, sp.age, sp.verified, sp.cat, sp.date].filter(Boolean).length;

  // Первое «избранное» событие уходит в баннер — приём афиш: одна большая
  // карточка задаёт тон, остальное идёт списком.
  const hero = !filtersUsed ? events.find((e) => e.featured) : undefined;
  const rest = hero ? events.filter((e) => e.id !== hero.id) : events;

  return (
    <div className="pt-4">
      <div className="px-4">
        <DateStrip selected={sp.date} hrefFor={(date) => withParam('date', date)} />
      </div>

      {hero && (
        <Link href={`/event/${hero.id}`} className="mt-4 block">
          <div className="relative aspect-[2.4/1] w-full overflow-hidden bg-raised">
            <img src={photoFor(hero.id, hero.category)} alt="" className="h-full w-full object-cover" />
            <div className="scrim absolute inset-0" />
            <div className="absolute inset-x-4 bottom-3.5">
              <span className="badge bg-white/90 text-[color:#0f1014]">{categoryLabel(hero.category)}</span>
              <h2
                className="mt-2 text-[22px] font-bold leading-[1.15] tracking-[-0.02em] text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {hero.title}
              </h2>
              <p className="mt-1 text-[13px] text-white/85">
                {formatDateTime(hero.starts_at)} · {hero.venue || hero.district}
              </p>
            </div>
          </div>
        </Link>
      )}

      <div className="px-4 pt-4">
        {/* Поиск и фильтры — обычная GET-форма, работает и без JS. */}
        <form className="space-y-2.5">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Хакатон, IELTS, пикник…"
              className="field flex-1"
            />
            <button type="submit" className="btn-secondary px-4">
              Найти
            </button>
          </div>

          <div className="flex gap-2">
            <select name="district" defaultValue={sp.district ?? ''} className="field min-w-0 flex-1 py-2.5 text-[13.5px]">
              <option value="">Весь город</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select name="price" defaultValue={sp.price ?? ''} className="field min-w-0 flex-1 py-2.5 text-[13.5px]">
              {PRICE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              name="age"
              type="number"
              min={6}
              max={60}
              defaultValue={sp.age ?? ''}
              placeholder="лет"
              className="field w-[74px] py-2.5 text-[13.5px]"
            />
          </div>

          <label className="flex items-center gap-2.5 px-0.5 text-[13.5px] text-ink-soft">
            <input
              type="checkbox"
              name="verified"
              value="1"
              defaultChecked={sp.verified === '1'}
              className="h-4 w-4"
              style={{ accentColor: 'var(--accent)' }}
            />
            Только проверенные организаторы
            {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
            {sp.date && <input type="hidden" name="date" value={sp.date} />}
          </label>
        </form>

        <div className="no-scrollbar -mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href={chipHref('')} className={`chip ${!sp.cat ? 'chip-active' : ''}`}>
            Всё
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={chipHref(c.id)} className={`chip ${sp.cat === c.id ? 'chip-active' : ''}`}>
              {c.label}
            </Link>
          ))}
        </div>

        <div className="mb-3.5 mt-6 flex items-baseline justify-between">
          <h1 className="t-title">{events.length > 0 ? `${events.length} событий` : 'Ничего не нашлось'}</h1>
          {filtersUsed > 0 && (
            <Link href="/" className="text-[13.5px] font-semibold" style={{ color: 'var(--accent)' }}>
              сбросить
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="card-quiet p-6 text-center">
            <p className="t-section">По таким условиям событий нет</p>
            <p className="t-small mt-2 text-muted">
              Снимите часть фильтров или опишите, что ищете, своими словами.
            </p>
            <Link href="/ai" className="btn-primary mt-4 w-full">
              Открыть AI-поиск
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {rest.map((event) => (
              <li key={event.id} className="rise">
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}

        <Link href="/ai" className="card-quiet mt-5 flex items-center gap-3 p-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            AI
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold">Не нашли подходящего?</span>
            <span className="block text-[13px] text-muted">
              Опишите словами — ассистент подберёт сам
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
