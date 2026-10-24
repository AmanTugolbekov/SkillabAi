import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { all, one, run } from './db';
import type { User } from './types';

const SESSION_COOKIE = 'es_session';
const SESSION_DAYS = 30;

/**
 * Авторизация без внешних библиотек: пароли через scrypt из стандартной
 * библиотеки Node, сессия — подписанная кука. Серверу не нужно хранить
 * таблицу сессий, а подделать куку без секрета нельзя.
 */
function secret() {
  const value = process.env.AUTH_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Не задан AUTH_SECRET — без него подписывать сессии нельзя.');
  }
  // Для локальной разработки хватает постоянного значения.
  return 'dev-secret-eventsphere';
}

// ---- Пароли -----------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

// ---- Сессия -----------------------------------------------------------------

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function startSession(userId: number) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** id пользователя из куки, если подпись верна и срок не истёк. */
export async function sessionUserId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [idPart, expiresPart, signature] = parts;

  const payload = `${idPart}.${expiresPart}`;
  const expectedSig = Buffer.from(sign(payload));
  const actualSig = Buffer.from(signature);
  if (expectedSig.length !== actualSig.length) return null;
  if (!timingSafeEqual(expectedSig, actualSig)) return null;

  if (Number(expiresPart) < Date.now()) return null;
  const id = Number(idPart);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// ---- Аккаунты ---------------------------------------------------------------

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  birthYear: number;
};

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return one<User>('SELECT * FROM users WHERE lower(email) = lower(?)', [email.trim()]);
}

export async function createAccount(input: SignUpInput): Promise<number> {
  const result = await run(
    `INSERT INTO users (name, email, password_hash, birth_year, city)
     VALUES (?, ?, ?, ?, 'Бишкек')`,
    [input.name.trim(), input.email.trim().toLowerCase(), hashPassword(input.password), input.birthYear],
  );
  return Number(result.lastInsertRowid);
}

/**
 * Вход через Google. Аккаунт ищем сначала по идентификатору Google, затем по
 * почте — чтобы человек, который сперва зарегистрировался паролем, вошёл в
 * тот же профиль, а не завёл второй.
 */
export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  name: string;
}): Promise<{ id: number; needsBirthYear: boolean }> {
  const bySub = await one<User>('SELECT * FROM users WHERE google_sub = ?', [profile.sub]);
  if (bySub) return { id: bySub.id, needsBirthYear: !bySub.birth_year };

  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    await run('UPDATE users SET google_sub = ? WHERE id = ?', [profile.sub, byEmail.id]);
    return { id: byEmail.id, needsBirthYear: !byEmail.birth_year };
  }

  // birth_year заполним на следующем шаге: Google его не отдаёт, а вся
  // возрастная логика приложения на нём держится.
  const result = await run(
    `INSERT INTO users (name, email, google_sub, birth_year, city)
     VALUES (?, ?, ?, 0, 'Бишкек')`,
    [profile.name || profile.email.split('@')[0], profile.email.toLowerCase(), profile.sub],
  );
  return { id: Number(result.lastInsertRowid), needsBirthYear: true };
}

export async function setBirthYear(userId: number, year: number) {
  await run('UPDATE users SET birth_year = ? WHERE id = ?', [year, userId]);
}

// ---- Детские профили ---------------------------------------------------------

export async function addChild(parentId: number, name: string, birthYear: number) {
  await run('INSERT INTO users (name, birth_year, city, parent_id) VALUES (?, ?, ?, ?)', [
    name.trim(),
    birthYear,
    'Бишкек',
    parentId,
  ]);
}

export async function removeChild(parentId: number, childId: number) {
  // Снимаем только собственные записи ребёнка и только своего ребёнка.
  const child = await one<User>('SELECT * FROM users WHERE id = ? AND parent_id = ?', [childId, parentId]);
  if (!child) return;
  await run(`UPDATE registrations SET status = 'cancelled' WHERE attendee_id = ?`, [childId]);
  await run('DELETE FROM users WHERE id = ?', [childId]);
}

/** Для экрана «кто уже в системе» в демо-режиме. */
export async function accountsWithPassword(): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
  return all<Pick<User, 'id' | 'name' | 'email'>>(
    `SELECT id, name, email FROM users
     WHERE password_hash IS NOT NULL AND email IS NOT NULL
     ORDER BY id LIMIT 5`,
  );
}

// ---- Google OAuth -------------------------------------------------------------

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(origin: string) {
  return `${origin}/api/auth/callback/google`;
}

export function googleAuthUrl(origin: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Меняет код на токены и достаёт профиль из id_token. */
export async function exchangeGoogleCode(code: string, origin: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: googleRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) throw new Error(`Google вернул ${response.status}`);

  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) throw new Error('Google не прислал id_token');

  // Токен получен напрямую от Google по TLS в обмен на наш секрет, поэтому
  // подпись можно не перепроверять — достаточно разобрать полезную часть.
  const payload = JSON.parse(
    Buffer.from(data.id_token.split('.')[1], 'base64url').toString('utf8'),
  ) as { sub: string; email?: string; name?: string; email_verified?: boolean };

  if (!payload.sub || !payload.email) throw new Error('В профиле Google нет почты');
  return { sub: payload.sub, email: payload.email, name: payload.name ?? '' };
}
