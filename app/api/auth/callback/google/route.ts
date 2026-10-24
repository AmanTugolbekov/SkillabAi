import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeGoogleCode, startSession, upsertGoogleUser } from '@/lib/auth';

export const runtime = 'nodejs';

/** Возврат от Google: сверяем state, меняем код на профиль, открываем сессию. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const store = await cookies();
  const saved = store.get('es_oauth')?.value ?? '';
  store.delete('es_oauth');

  const [savedState, next = '/'] = saved.split('|');
  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=Вход+через+Google+не+удался', url.origin));
  }

  try {
    const profile = await exchangeGoogleCode(code, url.origin);
    const { id, needsBirthYear } = await upsertGoogleUser(profile);
    await startSession(id);
    return NextResponse.redirect(new URL(needsBirthYear ? '/onboarding' : next, url.origin));
  } catch (error) {
    const message = encodeURIComponent((error as Error).message);
    return NextResponse.redirect(new URL(`/login?error=${message}`, url.origin));
  }
}
