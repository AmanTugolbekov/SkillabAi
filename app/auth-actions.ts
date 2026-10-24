'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  addChild,
  createAccount,
  endSession,
  findUserByEmail,
  removeChild,
  setBirthYear,
  startSession,
  verifyPassword,
} from '@/lib/auth';
import { requireUser } from '@/lib/session';

const MIN_YEAR = new Date().getFullYear() - 80;
const MAX_YEAR = new Date().getFullYear() - 6;

function fail(path: string, message: string, next?: string): never {
  const params = new URLSearchParams({ error: message });
  if (next) params.set('next', next);
  redirect(`${path}?${params}`);
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '') || '/';

  if (!email || !password) fail('/login', 'Введите почту и пароль', next);

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    fail('/login', 'Неверная почта или пароль', next);
  }

  await startSession(user.id);
  revalidatePath('/', 'layout');
  redirect(user.birth_year ? next : '/onboarding');
}

export async function signUpAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const birthYear = Number(formData.get('birth_year'));
  const next = String(formData.get('next') ?? '') || '/';

  if (name.length < 2) fail('/register', 'Укажите имя', next);
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) fail('/register', 'Проверьте адрес почты', next);
  if (password.length < 8) fail('/register', 'Пароль — не меньше 8 символов', next);
  if (!Number.isFinite(birthYear) || birthYear < MIN_YEAR || birthYear > MAX_YEAR) {
    fail('/register', 'Проверьте год рождения', next);
  }
  if (await findUserByEmail(email)) {
    fail('/register', 'Такая почта уже зарегистрирована', next);
  }

  const id = await createAccount({ name, email, password, birthYear });
  await startSession(id);
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signOutAction() {
  await endSession();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Год рождения спрашиваем отдельно: Google его не отдаёт. */
export async function completeProfileAction(formData: FormData) {
  const user = await requireUser();
  const birthYear = Number(formData.get('birth_year'));
  if (!Number.isFinite(birthYear) || birthYear < MIN_YEAR || birthYear > MAX_YEAR) {
    fail('/onboarding', 'Проверьте год рождения');
  }
  await setBirthYear(user.id, birthYear);
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function addChildAction(formData: FormData) {
  const parent = await requireUser();
  const name = String(formData.get('child_name') ?? '').trim();
  const birthYear = Number(formData.get('child_birth_year'));

  if (name.length < 2) fail('/profile', 'Укажите имя ребёнка');
  if (!Number.isFinite(birthYear) || birthYear < MAX_YEAR - 12 || birthYear > MAX_YEAR + 6) {
    fail('/profile', 'Проверьте год рождения ребёнка');
  }

  await addChild(parent.id, name, birthYear);
  revalidatePath('/profile');
  revalidatePath('/my');
}

export async function removeChildAction(formData: FormData) {
  const parent = await requireUser();
  await removeChild(parent.id, Number(formData.get('child_id')));
  revalidatePath('/profile');
  revalidatePath('/my');
}
