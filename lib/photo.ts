/**
 * Фотографии обложек.
 *
 * Приоритет: если нашёлся снимок настоящего места, о котором говорит событие
 * (библиотека им. Баялинова, Ботанический сад, КТУ, Джети-Огуз), берём его.
 * Там, где такого снимка нет, стоит тематический кадр по смыслу события.
 * Событие, созданное организатором, получает фотографию по своей категории.
 *
 * Все файлы — свободные лицензии, авторство в public/events/CREDITS.md.
 */

/** Снимки настоящих мест: событие → место из public/events/places. */
const REAL_PLACE: Record<number, string> = {
  4: 'library', // IELTS Speaking Club — Библиотека им. Баялинова
  9: 'ala-too-cinema', // Киноклуб — кинотеатр «Ала-Тоо»
  14: 'ala-archa', // Поход в горы под Бишкеком
  15: 'issyk-kul', // Поездка на Иссык-Куль
  16: 'ataturk-park', // Утренний бег — парк Ататюрка
  17: 'chuy-valley', // Велопрогулка по Чуйской долине
  19: 'botanical-garden', // Пикник — Ботанический сад
  20: 'supara', // Вечер кыргызского — этнокомплекс Supara
  22: 'ktu', // Git-воркшоп — КГТУ
  26: 'ala-too-square', // Фотопрогулка по старому Бишкеку
};

/** Тематические кадры для событий, место которых снять негде. */
const BY_EVENT: Record<number, string> = {
  1: 'hackathon',
  2: 'coding',
  3: 'lecture',
  5: 'exam',
  6: 'exam',
  7: 'books',
  8: 'poetry',
  10: 'robotics',
  11: 'coding',
  12: 'science',
  13: 'chess',
  18: 'boardgames',
  21: 'design',
  23: 'language',
  24: 'pottery',
  25: 'startup',
};

const BY_CATEGORY: Record<string, string> = {
  hackathon: 'hackathon',
  education: 'lecture',
  club: 'boardgames',
  trip: 'ala-archa',
  workshop: 'design',
  sport: 'running',
  creative: 'photowalk',
};

export function photoFor(eventId: number, category: string): string {
  const place = REAL_PLACE[eventId];
  if (place) return `/events/places/${place}.jpg`;

  const slug = BY_EVENT[eventId] ?? BY_CATEGORY[category] ?? 'lecture';
  if (slug === 'ala-archa') return '/events/places/ala-archa.jpg';
  return `/events/${slug}.jpg`;
}

/** true, если на обложке настоящее место события, а не тематический кадр. */
export function isRealPlace(eventId: number) {
  return eventId in REAL_PLACE;
}
