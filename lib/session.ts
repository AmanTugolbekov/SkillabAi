import { cookies } from 'next/headers';
import { demoUsers, getUser, organizerOf } from './queries';
import type { User } from './types';

const USER_COOKIE = 'es_user';
const ROLE_COOKIE = 'es_role';

export type Role = 'guest' | 'organizer';

/**
 * Демо-сессия: активный аккаунт и роль живут в cookie. Настоящая авторизация —
 * это отдельная задача, для прототипа важно быстро переключаться между
 * участником, родителем, ребёнком и организатором.
 */
export async function currentUser(): Promise<User> {
  const store = await cookies();
  const id = Number(store.get(USER_COOKIE)?.value);
  const user = Number.isFinite(id) && id > 0 ? getUser(id) : undefined;
  return user ?? demoUsers()[0];
}

export async function currentRole(): Promise<Role> {
  const store = await cookies();
  return store.get(ROLE_COOKIE)?.value === 'organizer' ? 'organizer' : 'guest';
}

export async function setCurrentUser(id: number) {
  const store = await cookies();
  store.set(USER_COOKIE, String(id), { path: '/', maxAge: 60 * 60 * 24 * 30 });
}

export async function setRole(role: Role) {
  const store = await cookies();
  store.set(ROLE_COOKIE, role, { path: '/', maxAge: 60 * 60 * 24 * 30 });
}

/** Профиль организатора активного пользователя, если он уже создан. */
export async function currentOrganizer() {
  const user = await currentUser();
  return organizerOf(user.id);
}

const THEME_COOKIE = 'es_theme';

export type Theme = 'light' | 'dark' | null;

/** null — следуем системной настройке устройства. */
export async function currentTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : null;
}

export async function setTheme(theme: 'light' | 'dark') {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, { path: '/', maxAge: 60 * 60 * 24 * 365 });
}
