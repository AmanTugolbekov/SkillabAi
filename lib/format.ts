const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const DAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/** «2026-11-07 10:00» → Date. SQLite хранит дату без таймзоны. */
export function parseSql(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(value: string | null): string {
  const d = parseSql(value);
  if (!d) return 'дата не указана';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${time}`;
}

export function formatDateShort(value: string | null): string {
  const d = parseSql(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Склонение по числу: 1 день, 2 дня, 5 дней, 21 день, 41 день. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function formatPrice(price: number): string {
  return price === 0 ? 'Бесплатно' : `${price.toLocaleString('ru-RU')} сом`;
}

/** «осталось 3 дня» / «дедлайн прошёл» — для плашки на карточке. */
export function deadlineLabel(value: string | null): { text: string; urgent: boolean } | null {
  const d = parseSql(value);
  if (!d) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs < 0) return { text: 'регистрация закрыта', urgent: true };
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return { text: `до дедлайна ${hours} ч`, urgent: true };
  const days = Math.floor(hours / 24);
  return { text: `до дедлайна ${days} ${plural(days, 'день', 'дня', 'дней')}`, urgent: days <= 3 };
}

export function ageLabel(min: number, max: number): string {
  if (min === 0 && max >= 99) return 'любой возраст';
  if (max >= 99) return `${min}+`;
  if (min === 0) return `до ${max} лет`;
  return `${min}–${max} лет`;
}

/** «1 год», «22 года», «10 лет». */
export function ageText(years: number): string {
  return `${years} ${plural(years, 'год', 'года', 'лет')}`;
}

/** Денежная сумма без подмены нуля на «Бесплатно» — для сборов и статистики. */
export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} сом`;
}
