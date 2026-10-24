import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser, organizerOf } from './queries';
import { sessionUserId } from './auth';
import type { User } from './types';

const ROLE_COOKIE = 'es_role';
const THEME_COOKIE = 'es_theme';

export type Role = 'guest' | 'organizer';

/** Авторизованный пользователь или null, если вход не выполнен. */
export async function currentUser(): Promise<User | null> {
  const id = await sessionUserId();
  if (!id) return null;
  return (await getUser(id)) ?? null;
}

/** Для экранов, которые без входа не имеют смысла. */
export async function requireUser(returnTo?: string): Promise<User> {
  const user = await currentUser();
  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
  }
  return user;
}

export async function currentRole(): Promise<Role> {
  const store = await cookies();
  return store.get(ROLE_COOKIE)?.value === 'organizer' ? 'organizer' : 'guest';
}

export async function setRole(role: Role) {
  const store = await cookies();
  store.set(ROLE_COOKIE, role, { path: '/', maxAge: 60 * 60 * 24 * 30 });
}

/** Профиль организатора активного пользователя, если он уже создан. */
export async function currentOrganizer() {
  const user = await currentUser();
  if (!user) return undefined;
  return organizerOf(user.id);
}

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
