import { NextResponse } from 'next/server';
import { interpretSearch } from '@/lib/ai';
import { listEvents } from '@/lib/queries';

export const runtime = 'nodejs';

/** Запрос обычными словами → фильтры → подборка событий. */
export async function POST(request: Request) {
  const { query } = (await request.json()) as { query?: string };
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Слишком короткий запрос' }, { status: 400 });
  }

  const { data: intent, engine } = await interpretSearch(query.trim());

  let events = await listEvents({
    keywords: intent.keywords,
    categories: intent.categories,
    districts: intent.districts,
    maxPrice: intent.max_price,
    freeOnly: intent.free_only,
    age: intent.age,
    dateFrom: intent.date_from,
    dateTo: intent.date_to,
    limit: 8,
  });

  // Строгие фильтры могут не дать ничего — ослабляем по одному, чтобы
  // ассистент всегда отвечал по делу, а не пустым списком.
  let relaxed: string | null = null;
  if (events.length === 0 && (intent.date_from || intent.date_to)) {
    events = await listEvents({
      keywords: intent.keywords,
      categories: intent.categories,
      districts: intent.districts,
      maxPrice: intent.max_price,
      freeOnly: intent.free_only,
      age: intent.age,
      limit: 8,
    });
    relaxed = 'На эти даты ничего не нашлось — показываю ближайшие похожие события.';
  }
  if (events.length === 0 && intent.keywords.length > 0) {
    events = await listEvents({
      categories: intent.categories,
      districts: intent.districts,
      maxPrice: intent.max_price,
      freeOnly: intent.free_only,
      age: intent.age,
      limit: 8,
    });
    relaxed = 'Точного совпадения по словам нет — вот что близко по смыслу.';
  }
  if (events.length === 0) {
    events = await listEvents({ age: intent.age, limit: 5 });
    relaxed = 'Под такие условия пока ничего нет. Вот что вообще идёт в городе.';
  }

  return NextResponse.json({ reply: intent.reply, intent, events, engine, relaxed });
}
