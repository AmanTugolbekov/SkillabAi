import { all, one, run } from './db';
import type { EventCard, EventRow, KycStatus, Organizer, User } from './types';
import type { EventDraft } from './ai-shape';

export type Filters = {
  q?: string;
  keywords?: string[];
  categories?: string[];
  districts?: string[];
  maxPrice?: number | null;
  freeOnly?: boolean;
  age?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  verifiedOnly?: boolean;
  organizerId?: number;
  limit?: number;
};

const EVENT_SELECT = `
  SELECT e.*, o.display_name AS organizer_name, o.kyc_status, o.rating, o.reviews_count,
         -- место считается занятым только после подтверждения: заявки детей,
         -- ожидающие родителя, лимит не расходуют
         (SELECT COUNT(*) FROM registrations r
           WHERE r.event_id = e.id AND r.status = 'confirmed') AS taken
  FROM events e
  JOIN organizers o ON o.id = e.organizer_id`;

type RawCard = EventRow & {
  organizer_name: string;
  kyc_status: KycStatus;
  rating: number;
  reviews_count: number;
  taken: number;
};

function parseJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toCard(row: RawCard): EventCard {
  return {
    ...row,
    timing: parseJson(row.timing),
    requirements: parseJson(row.requirements),
    perks: parseJson(row.perks),
    tags: parseJson(row.tags),
    featured: row.featured === 1,
  };
}

export async function listEvents(f: Filters = {}): Promise<EventCard[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  // Текстовый поиск: по заголовку, описанию, месту и тегам.
  const terms = [...(f.keywords ?? []), ...(f.q ? [f.q] : [])].filter(Boolean);
  if (terms.length) {
    const ors = terms.map(() => `(e.title LIKE ? OR e.summary LIKE ? OR e.details LIKE ? OR e.venue LIKE ? OR e.tags LIKE ?)`);
    where.push(`(${ors.join(' OR ')})`);
    for (const term of terms) {
      const like = `%${term}%`;
      params.push(like, like, like, like, like);
    }
  }
  if (f.categories?.length) {
    where.push(`e.category IN (${f.categories.map(() => '?').join(',')})`);
    params.push(...f.categories);
  }
  if (f.districts?.length) {
    where.push(`e.district IN (${f.districts.map(() => '?').join(',')})`);
    params.push(...f.districts);
  }
  if (f.freeOnly) where.push('e.price = 0');
  else if (typeof f.maxPrice === 'number') {
    where.push('e.price <= ?');
    params.push(f.maxPrice);
  }
  if (typeof f.age === 'number') {
    where.push('e.min_age <= ? AND e.max_age >= ?');
    params.push(f.age, f.age);
  }
  if (f.dateFrom) {
    where.push('date(e.starts_at) >= date(?)');
    params.push(f.dateFrom);
  }
  if (f.dateTo) {
    where.push('date(e.starts_at) <= date(?)');
    params.push(f.dateTo);
  }
  if (f.verifiedOnly) where.push(`o.kyc_status = 'verified'`);
  if (f.organizerId) {
    where.push('e.organizer_id = ?');
    params.push(f.organizerId);
  }

  const sql = `${EVENT_SELECT}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY e.featured DESC, e.starts_at ASC
    LIMIT ?`;
  params.push(f.limit ?? 60);

  return (await all<RawCard>(sql, params)).map(toCard);
}

export async function getEvent(id: number): Promise<EventCard | null> {
  const row = await one<RawCard>(`${EVENT_SELECT} WHERE e.id = ?`, [id]);
  return row ? toCard(row) : null;
}

// ---- Пользователи -----------------------------------------------------------

export async function getUser(id: number): Promise<User | undefined> {
  return one<User>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function childrenOf(parentId: number): Promise<User[]> {
  return all<User>('SELECT * FROM users WHERE parent_id = ? ORDER BY birth_year DESC', [parentId]);
}

export function ageOf(user: Pick<User, 'birth_year'>) {
  return new Date().getFullYear() - user.birth_year;
}

/** Детским считаем профиль с родителем и возрастом младше 13. */
export function isChildAccount(user: User) {
  return user.parent_id !== null && ageOf(user) < 13;
}

// ---- Организаторы -----------------------------------------------------------

export async function organizerOf(userId: number): Promise<Organizer | undefined> {
  return one<Organizer>('SELECT * FROM organizers WHERE user_id = ?', [userId]);
}

export async function organizerById(id: number): Promise<Organizer | undefined> {
  return one<Organizer>('SELECT * FROM organizers WHERE id = ?', [id]);
}

/** Создаёт профиль организатора при первом входе в режим организатора. */
export async function ensureOrganizer(userId: number): Promise<Organizer> {
  const existing = await organizerOf(userId);
  if (existing) return existing;
  const user = await getUser(userId);
  await run('INSERT INTO organizers (user_id, display_name) VALUES (?, ?)', [
    userId,
    user?.name ?? 'Организатор',
  ]);
  return (await organizerOf(userId))!;
}

export async function submitKyc(
  organizerId: number,
  data: { full_name: string; doc_type: string; doc_number: string; about: string },
) {
  await run(
    `UPDATE organizers
     SET kyc_status = 'pending', kyc_full_name = ?, kyc_doc_type = ?, kyc_doc_last4 = ?,
         about = ?, kyc_submitted_at = datetime('now','localtime'), kyc_reviewed_at = NULL, kyc_note = NULL
     WHERE id = ?`,
    [data.full_name, data.doc_type, data.doc_number.slice(-4), data.about, organizerId],
  );
}

export async function reviewKyc(organizerId: number, approve: boolean, note = '') {
  await run(
    `UPDATE organizers
     SET kyc_status = ?, kyc_reviewed_at = datetime('now','localtime'), kyc_note = ?
     WHERE id = ?`,
    [approve ? 'verified' : 'rejected', note, organizerId],
  );
}

export async function pendingKyc(): Promise<(Organizer & { user_name: string })[]> {
  return all<Organizer & { user_name: string }>(
    `SELECT o.*, u.name AS user_name FROM organizers o
     JOIN users u ON u.id = o.user_id
     WHERE o.kyc_status IN ('pending', 'rejected')
     ORDER BY o.kyc_submitted_at DESC`,
  );
}

export async function allOrganizers(): Promise<(Organizer & { user_name: string; events: number })[]> {
  return all<Organizer & { user_name: string; events: number }>(
    `SELECT o.*, u.name AS user_name,
            (SELECT COUNT(*) FROM events e WHERE e.organizer_id = o.id) AS events
     FROM organizers o JOIN users u ON u.id = o.user_id
     ORDER BY CASE o.kyc_status WHEN 'pending' THEN 0 WHEN 'none' THEN 1 ELSE 2 END, o.id`,
  );
}

// ---- Создание ивента --------------------------------------------------------

export async function createEvent(organizerId: number, draft: EventDraft): Promise<number> {
  const result = await run(
    `INSERT INTO events (organizer_id, title, summary, category, format, district, venue, price,
       starts_at, ends_at, deadline_at, min_age, max_age, capacity, cover,
       timing, requirements, perks, tags, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      organizerId, draft.title, draft.summary, draft.category, draft.format, draft.district,
      draft.venue, draft.price, draft.starts_at, draft.ends_at, draft.deadline_at,
      draft.min_age, draft.max_age, draft.capacity, draft.cover,
      JSON.stringify(draft.timing), JSON.stringify(draft.requirements),
      JSON.stringify(draft.perks), JSON.stringify(draft.tags), draft.details,
    ],
  );
  return Number(result.lastInsertRowid);
}

// ---- Регистрации ------------------------------------------------------------

export type RegistrationView = {
  id: number;
  event_id: number;
  status: 'awaiting_parent' | 'confirmed' | 'cancelled';
  created_at: string;
  attendee_id: number;
  attendee_name: string;
  booked_by_id: number;
  title: string;
  cover: string;
  starts_at: string;
  venue: string;
  district: string;
  price: number;
};

const REG_SELECT = `
  SELECT r.id, r.event_id, r.status, r.created_at, r.attendee_id, r.booked_by_id,
         a.name AS attendee_name,
         e.title, e.cover, e.starts_at, e.venue, e.district, e.price
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  JOIN users a ON a.id = r.attendee_id`;

/** Мои записи плюс записи моих детей — родитель видит всё в одном месте. */
export async function registrationsFor(userId: number): Promise<RegistrationView[]> {
  return all<RegistrationView>(
    `${REG_SELECT}
     WHERE r.attendee_id = ? OR r.booked_by_id = ? OR a.parent_id = ?
     ORDER BY e.starts_at ASC`,
    [userId, userId, userId],
  );
}

export async function registrationFor(eventId: number, attendeeId: number) {
  return one<{ id: number; status: string }>(
    'SELECT id, status FROM registrations WHERE event_id = ? AND attendee_id = ?',
    [eventId, attendeeId],
  );
}

export type RegisterOutcome =
  | { ok: true; status: 'confirmed' | 'awaiting_parent' }
  | { ok: false; reason: string };

/**
 * Записывает участника на ивент.
 * Если записывается сам ребёнок младше 13 — заявка ждёт подтверждения родителя.
 */
export async function register(
  eventId: number,
  attendeeId: number,
  bookedById: number,
): Promise<RegisterOutcome> {
  const event = await getEvent(eventId);
  const attendee = await getUser(attendeeId);
  if (!event || !attendee) return { ok: false, reason: 'Событие или участник не найдены' };

  if (await registrationFor(eventId, attendeeId)) {
    return { ok: false, reason: 'Этот участник уже записан' };
  }
  if (event.capacity > 0 && event.taken >= event.capacity) {
    return { ok: false, reason: 'Мест больше нет' };
  }
  if (event.deadline_at && new Date(event.deadline_at.replace(' ', 'T')) < new Date()) {
    return { ok: false, reason: 'Дедлайн регистрации прошёл' };
  }
  const age = ageOf(attendee);
  if (age < event.min_age || age > event.max_age) {
    return { ok: false, reason: `Возрастное ограничение: ${event.min_age}–${event.max_age} лет` };
  }
  if (event.kyc_status !== 'verified' && event.price > 0) {
    return { ok: false, reason: 'Организатор не прошёл верификацию — платная запись закрыта' };
  }

  // Ребёнок сам себя записать не может: заявка уходит родителю.
  const needsParent = isChildAccount(attendee) && bookedById === attendeeId;
  const status = needsParent ? 'awaiting_parent' : 'confirmed';
  await run(
    'INSERT INTO registrations (event_id, attendee_id, booked_by_id, status) VALUES (?, ?, ?, ?)',
    [eventId, attendeeId, bookedById, status],
  );
  return { ok: true, status };
}

export async function confirmRegistration(id: number, parentId: number) {
  await run(
    `UPDATE registrations SET status = 'confirmed', booked_by_id = ?
     WHERE id = ? AND status = 'awaiting_parent'`,
    [parentId, id],
  );
}

export async function cancelRegistration(id: number) {
  await run(`UPDATE registrations SET status = 'cancelled' WHERE id = ?`, [id]);
}

/** Заявки детей, ожидающие решения родителя. */
export async function awaitingParent(parentId: number): Promise<RegistrationView[]> {
  return all<RegistrationView>(
    `${REG_SELECT}
     WHERE a.parent_id = ? AND r.status = 'awaiting_parent'
     ORDER BY r.created_at DESC`,
    [parentId],
  );
}

/** Участники события — для списка в режиме организатора. */
export async function attendeesOf(eventId: number) {
  return all<{ id: number; name: string; avatar: string; status: string; birth_year: number }>(
    `SELECT u.id, u.name, u.avatar, r.status, u.birth_year
     FROM registrations r JOIN users u ON u.id = r.attendee_id
     WHERE r.event_id = ? AND r.status != 'cancelled'
     ORDER BY r.created_at`,
    [eventId],
  );
}

export async function statsFor(organizerId: number) {
  return (await one<{ events: number; attendees: number; revenue: number }>(
    `SELECT
       (SELECT COUNT(*) FROM events WHERE organizer_id = ?) AS events,
       (SELECT COUNT(*) FROM registrations r JOIN events e ON e.id = r.event_id
         WHERE e.organizer_id = ? AND r.status = 'confirmed') AS attendees,
       (SELECT COALESCE(SUM(e.price), 0) FROM registrations r JOIN events e ON e.id = r.event_id
         WHERE e.organizer_id = ? AND r.status = 'confirmed') AS revenue`,
    [organizerId, organizerId, organizerId],
  ))!;
}
