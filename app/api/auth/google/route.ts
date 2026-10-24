import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { googleAuthUrl, googleEnabled } from '@/lib/auth';

export const runtime = 'nodejs';

/** Начало входа через Google: запоминаем state и уводим на их экран. */
export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=Вход+через+Google+не+настроен', request.url));
  }

  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/';
  const state = randomBytes(16).toString('hex');

  const store = await cookies();
  store.set('es_oauth', `${state}|${next}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
  });

  return NextResponse.redirect(googleAuthUrl(url.origin, state));
}
