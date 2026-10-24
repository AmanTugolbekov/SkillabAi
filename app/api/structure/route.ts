import { NextResponse } from 'next/server';
import { structureEvent } from '@/lib/ai';

export const runtime = 'nodejs';

/** Сплошной текст организатора → структурированный черновик ивента. */
export async function POST(request: Request) {
  const { raw } = (await request.json()) as { raw?: string };
  if (!raw || raw.trim().length < 20) {
    return NextResponse.json(
      { error: 'Нужно хотя бы пара предложений, чтобы было что структурировать' },
      { status: 400 },
    );
  }

  const { data, engine, note } = await structureEvent(raw.trim());
  return NextResponse.json({ draft: data, engine, note });
}
