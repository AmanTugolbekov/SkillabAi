/**
 * Эвристики, которые работают без ключа Anthropic.
 *
 * Это не имитация ответа: обе функции реально разбирают текст и дают
 * осмысленный результат. С ключом их заменяет Claude (lib/ai.ts),
 * качество растёт, но демо не ломается, если ключа нет.
 */
import { CATEGORIES, DISTRICTS } from './types';
import type { EventDraft, SearchIntent } from './ai-shape';

type Category = EventDraft['category'];
type District = EventDraft['district'];

const MONTHS: Record<string, number> = {
  январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6,
  июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
};

const CATEGORY_WORDS: Record<Category, string[]> = {
  hackathon: ['хакатон', 'hack', 'стартап', 'startup', 'питч', 'демо-день'],
  education: ['курс', 'лекци', 'урок', 'язык', 'англ', 'ielts', 'немец', 'кыргыз', 'учёб', 'учеб', 'тест', 'интенсив', 'клуб разговор', 'speaking'],
  club: ['клуб', 'настолк', 'книж', 'кино', 'пикник', 'встреч', 'знакомств', 'тусовк'],
  trip: ['поход', 'поездк', 'тур', 'иссык', 'горы', 'ущель', 'треккинг', 'выезд', 'водопад'],
  workshop: ['воркшоп', 'мастер-класс', 'мастерск', 'практикум', 'робот', 'опыт'],
  sport: ['спорт', 'бег', 'футбол', 'баскетбол', 'велос', 'шахмат', 'йог', 'турнир'],
  creative: ['творч', 'рисов', 'фото', 'керамик', 'поэз', 'музык', 'танц', 'театр'],
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Ищет в тексте дату вида «7 ноября», «15.11», «15/11» и возвращает YYYY-MM-DD. */
function findDate(text: string, fallbackYear: number): string | null {
  const byName = text.match(/(\d{1,2})\s+([а-яё]{3,})/i);
  if (byName) {
    const key = Object.keys(MONTHS).find((m) => byName[2].toLowerCase().startsWith(m));
    if (key) return `${fallbackYear}-${pad(MONTHS[key])}-${pad(Number(byName[1]))}`;
  }
  const numeric = text.match(/(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?/);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : fallbackYear;
    return `${year}-${pad(Number(numeric[2]))}-${pad(Number(numeric[1]))}`;
  }
  return null;
}

/** Все отметки времени вида 10:00 в порядке появления. */
function findTimes(text: string): string[] {
  return [...text.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map(
    (m) => `${pad(Number(m[1]))}:${m[2]}`,
  );
}

function detectCategory(text: string): Category {
  const low = text.toLowerCase();
  let best: Category = 'club';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_WORDS) as [Category, string[]][]) {
    const score = words.filter((w) => low.includes(w)).length;
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

function detectDistrict(text: string): District {
  const low = text.toLowerCase();
  if (low.includes('онлайн') || low.includes('zoom') || low.includes('google meet')) return 'Онлайн';
  if (low.includes('за город') || low.includes('ущель') || low.includes('иссык') || low.includes('природ')) {
    return 'За городом';
  }
  for (const d of DISTRICTS) {
    if (low.includes(d.toLowerCase())) return d;
  }
  return 'Центр';
}

const COVERS: Record<Category, string> = {
  hackathon: '💻', education: '📚', club: '🫂', trip: '🏔️',
  workshop: '🛠️', sport: '🏀', creative: '🎨',
};

/**
 * Разбирает «сплошной текст» организатора на структурированный черновик.
 * Логика: первая осмысленная строка — заголовок; строки со временем —
 * тайминг; строки про «нужно взять» — требования; строки про «входит» — что
 * включено; остальное уходит в подробности.
 */
export function structureEventFallback(raw: string): EventDraft {
  const year = new Date().getFullYear();

  // Организаторы пишут и списком, и одним абзацем. Поэтому работаем не со
  // строками, а с короткими отрезками: строка, предложение или часть фразы
  // между запятыми — так разбор одинаково работает в обоих случаях.
  const sentences = raw
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-–—•*\d.)\s]+/, '').trim())
    .filter((s) => s.length > 1);

  const clauses = sentences
    .flatMap((s) => s.split(/[,;]\s*/))
    .map((c) => c.replace(/[.!?]+$/, '').trim())
    .filter((c) => c.length > 2);

  const title = makeTitle(sentences[0] ?? '');

  const timing: string[] = [];
  const requirements: string[] = [];
  const perks: string[] = [];
  const rest: string[] = [];

  const needWords = ['нужно', 'взять', 'с собой', 'требован', 'обязательн', 'при себе',
    'уровень', 'принесите', 'принести', 'возьмите', 'захватите', 'напишите до', 'не забудь'];
  const perkWords = ['входит', 'включен', 'включён', 'предоставл', 'дадим', 'в стоимость',
    'получите', 'приз', 'будет', 'за счёт', 'бонус'];

  // Первый отрезок уже ушёл в заголовок — в подробностях он был бы повтором.
  for (const clause of clauses.slice(1)) {
    const low = clause.toLowerCase();
    if (findTimes(clause).length > 0) timing.push(capitalize(clause));
    else if (needWords.some((w) => low.includes(w))) requirements.push(capitalize(clause));
    else if (perkWords.some((w) => low.includes(w))) perks.push(capitalize(clause));
    // Остатки первой фразы не повторяем: они уже прозвучали в заголовке.
    else if (!(sentences[0] ?? '').includes(clause)) rest.push(clause);
  }

  const priceMatch = raw.match(/(\d[\d\s]{1,7})\s*(?:сом|c\b|kgs|сомов)/i);
  const isFree = /\bбесплатн/i.test(raw);
  const price = isFree ? 0 : priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : 0;

  const ageRange = raw.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*лет/);
  const ageFrom = raw.match(/(?:с|от)\s+(\d{1,2})\s*лет/i);
  const agePlus = raw.match(/(\d{1,2})\s*\+/);
  const minAge = ageRange
    ? Number(ageRange[1])
    : ageFrom
      ? Number(ageFrom[1])
      : agePlus
        ? Number(agePlus[1])
        : 0;
  const maxAge = ageRange ? Number(ageRange[2]) : 99;

  const capacity = Number(raw.match(/(?:до|максимум|не более)\s+(\d{1,4})\s*(?:чел|участник|мест)/i)?.[1] ?? 0);

  const date = findDate(raw, year);
  const times = findTimes(raw);
  const startTime = times[0] ?? '18:00';
  const endTime = times.length > 1 ? times[times.length - 1] : null;

  const deadline = raw.match(/(?:дедлайн|регистраци[яи] до|заявки до|до)\s+(\d{1,2}\s+[а-яё]{3,}|\d{1,2}[.\/]\d{1,2})/i);
  const deadlineDate = deadline ? findDate(deadline[1], year) : null;

  const venue = findVenue(raw, clauses);

  const category = detectCategory(raw);

  // Первый содержательный «остаток» идёт в описание, остальное — в подробности.
  const summarySource = rest.find((c) => c.length > 20);
  const details = rest.filter((c) => c !== summarySource);

  return {
    title,
    summary: capitalize(summarySource ?? sentences[1] ?? title).slice(0, 160),
    category,
    format: detectDistrict(raw) === 'Онлайн' ? 'online' : 'offline',
    district: detectDistrict(raw),
    venue,
    price,
    starts_at: `${date ?? new Date().toISOString().slice(0, 10)} ${startTime}`,
    ends_at: endTime ? `${date ?? new Date().toISOString().slice(0, 10)} ${endTime}` : null,
    deadline_at: deadlineDate ? `${deadlineDate} 23:59` : null,
    min_age: minAge,
    max_age: maxAge,
    capacity,
    cover: COVERS[category] ?? '🎉',
    timing,
    requirements,
    perks,
    tags: [],
    details: details.map(capitalize).join('. '),
  };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Делает из первой фразы заголовок: убирает обращение («Народ,», «Ребята,»)
 * и вводную дату, оставляя суть — «Собираемся на пикник в Ботаническом саду».
 */
function makeTitle(firstSentence: string): string {
  let text = firstSentence
    .replace(/^(народ|ребят[ае]?|друзья|всем привет|привет|коллеги|дороги[ему]\s+\w+)[,!\s]+/i, '')
    .replace(/^(в|во)\s+(эт[уои]|следующ\w+|ближайш\w+)?\s*\w*(понедельник|вторник|сред[ауы]|четверг|пятниц[ауы]|суббот[ауы]|воскресень[ея])[,\s]+/i, '')
    .replace(/^\d{1,2}\s+[а-яё]{3,}[,\s]+/i, '')
    .replace(/^(в|во)\s+\d{1,2}[:.]\d{2}[,\s]+/i, '')
    .trim();

  // Длинную фразу режем по первой запятой — дальше обычно уже детали.
  if (text.length > 70) {
    const cut = text.indexOf(',', 20);
    if (cut > 0) text = text.slice(0, cut);
  }
  text = text.replace(/[.,:;\s]+$/, '').slice(0, 90);
  return text.length > 2 ? capitalize(text) : 'Новое событие';
}

/** Ищет место сбора: сначала явный адрес, потом фразу про сбор. */
function findVenue(raw: string, clauses: string[]): string {
  const explicit = raw.match(/(?:адрес|локация|место сбора)[:\s]+([^\n.;,]{4,80})/i)?.[1];
  if (explicit) return explicit.trim();

  const street = raw.match(/(?:ул\.|улица|проспект|мкр\.?)\s*[^\n.;,]{3,50}/i)?.[0];
  if (street) return street.trim();

  // «Сбор у входа» точнее, чем «собираемся на пикник», поэтому ищем его первым.
  const meeting =
    clauses.find((c) => /сбор|встречаемся|приходите/i.test(c)) ??
    clauses.find((c) => /собираемся/i.test(c));
  if (meeting) {
    const place = meeting.replace(/.*?(?:сбор|собираемся|встречаемся|приходите)\s*/i, '').trim();
    const cleaned = place.replace(/^(в|во|на|у)\s+\d{1,2}[:.]\d{2}\s*/i, '').trim();
    if (cleaned.length > 3) return cleaned.slice(0, 80);
  }

  const proper = raw.match(/(?:в|на)\s+([А-ЯЁ][а-яё]+(?:ом|ой|е|у)?\s+[а-яё]{3,}[уе])/);
  return proper ? proper[0].replace(/^(в|на)\s+/, '').trim() : '';
}

/** Понедельник=1 ... Воскресенье=7 */
function isoDow(d: Date) {
  return d.getDay() === 0 ? 7 : d.getDay();
}

function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Разбирает поисковый запрос на естественном языке в набор фильтров. */
export function interpretSearchFallback(query: string): SearchIntent {
  const low = query.toLowerCase();
  const now = new Date();

  const categories = (Object.entries(CATEGORY_WORDS) as [Category, string[]][])
    .filter(([, words]) => words.some((w) => low.includes(w)))
    .map(([cat]) => cat);

  const found: District[] = DISTRICTS.filter((d) => low.includes(d.toLowerCase()));
  if (low.includes('за город') || low.includes('природ') || low.includes('горы')) found.push('За городом');
  if (low.includes('онлайн')) found.push('Онлайн');
  const districts = [...new Set(found)];

  const priceMatch = low.match(/(?:до|дешевле|не дороже|максимум)\s+(\d[\d\s]{0,6})/);
  const maxPrice = priceMatch ? Number(priceMatch[1].replace(/\s/g, '')) : null;
  const freeOnly = /бесплатн|без оплат|даром/.test(low);

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  if (/выходн|суббот|воскресен/.test(low)) {
    const toSaturday = (6 - isoDow(now) + 7) % 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() + toSaturday);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    dateFrom = iso(sat);
    dateTo = iso(sun);
  } else if (/сегодня/.test(low)) {
    dateFrom = iso(now);
    dateTo = iso(now);
  } else if (/завтра/.test(low)) {
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    dateFrom = iso(t);
    dateTo = iso(t);
  } else if (/на этой недел|эту недел/.test(low)) {
    const end = new Date(now);
    end.setDate(now.getDate() + (7 - isoDow(now)));
    dateFrom = iso(now);
    dateTo = iso(end);
  }

  const ageMatch = low.match(/(\d{1,2})\s*(?:лет|год)/);
  let age = ageMatch ? Number(ageMatch[1]) : null;
  if (age === null && /для детей|ребён|ребен|школьник/.test(low)) age = 10;

  const stop = new Set([
    'найди', 'мне', 'на', 'в', 'за', 'до', 'для', 'и', 'или', 'с', 'по', 'это',
    'хочу', 'ищу', 'что-нибудь', 'куда', 'пойти', 'выходные', 'городом', 'сом',
    'сомов', 'бесплатно', 'рядом', 'около', 'лет', 'год',
  ]);
  const keywords = low
    .replace(/[^а-яёa-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w) && !/^\d+$/.test(w));

  const parts: string[] = [];
  if (categories.length) {
    parts.push(categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label.toLowerCase()).join(' и '));
  }
  if (districts.length) parts.push(districts.join('/').toLowerCase());
  if (freeOnly) parts.push('только бесплатные');
  else if (maxPrice) parts.push(`до ${maxPrice} сом`);
  if (dateFrom && dateTo && dateFrom !== dateTo) parts.push('на выходные');
  else if (dateFrom) parts.push('на эти даты');
  if (age) parts.push(`для возраста ${age}`);

  const reply = parts.length
    ? `Понял запрос: ${parts.join(', ')}. Вот что подходит:`
    : 'Поискал по ключевым словам. Вот самое близкое:';

  return {
    reply,
    keywords,
    categories,
    districts,
    max_price: maxPrice,
    free_only: freeOnly,
    age,
    date_from: dateFrom,
    date_to: dateTo,
  };
}
