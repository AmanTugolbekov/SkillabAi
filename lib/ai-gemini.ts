/**
 * Бесплатный движок AI: Gemini через AI Studio.
 *
 * Используется, когда ключа Anthropic нет, но есть GEMINI_API_KEY. Промпты
 * и формы ответа те же, что у Claude, — различается только транспорт.
 * Ответ проверяется теми же zod-схемами, и при несовпадении вызывающий код
 * уходит на встроенные правила.
 */
import { EventDraftSchema, SearchIntentSchema } from './ai-shape';
import type { EventDraft, SearchIntent } from './ai-shape';
import { CATEGORIES, DISTRICTS } from './types';

const MODEL = 'gemini-3.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function geminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Схема ответа в диалекте Gemini: типы заглавными, nullable отдельным полем. */
const EVENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    summary: { type: 'STRING' },
    category: { type: 'STRING', enum: CATEGORY_IDS },
    format: { type: 'STRING', enum: ['offline', 'online', 'hybrid'] },
    district: { type: 'STRING', enum: [...DISTRICTS] },
    venue: { type: 'STRING' },
    price: { type: 'INTEGER' },
    starts_at: { type: 'STRING' },
    ends_at: { type: 'STRING', nullable: true },
    deadline_at: { type: 'STRING', nullable: true },
    min_age: { type: 'INTEGER' },
    max_age: { type: 'INTEGER' },
    capacity: { type: 'INTEGER' },
    cover: { type: 'STRING' },
    timing: { type: 'ARRAY', items: { type: 'STRING' } },
    requirements: { type: 'ARRAY', items: { type: 'STRING' } },
    perks: { type: 'ARRAY', items: { type: 'STRING' } },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    details: { type: 'STRING' },
  },
  required: [
    'title', 'summary', 'category', 'format', 'district', 'venue', 'price',
    'starts_at', 'min_age', 'max_age', 'capacity', 'cover',
    'timing', 'requirements', 'perks', 'tags', 'details',
  ],
};

const SEARCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    keywords: { type: 'ARRAY', items: { type: 'STRING' } },
    categories: { type: 'ARRAY', items: { type: 'STRING', enum: CATEGORY_IDS } },
    districts: { type: 'ARRAY', items: { type: 'STRING', enum: [...DISTRICTS] } },
    max_price: { type: 'INTEGER', nullable: true },
    free_only: { type: 'BOOLEAN' },
    age: { type: 'INTEGER', nullable: true },
    date_from: { type: 'STRING', nullable: true },
    date_to: { type: 'STRING', nullable: true },
  },
  required: ['reply', 'keywords', 'categories', 'districts', 'free_only'],
};

async function generate(system: string, user: string, schema: object): Promise<unknown> {
  const response = await fetch(`${ENDPOINT}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini вернул ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini вернул пустой ответ');
  return JSON.parse(text);
}

export async function structureEventGemini(
  system: string,
  raw: string,
  today: string,
): Promise<EventDraft> {
  const parsed = EventDraftSchema.safeParse(
    await generate(system, `Сегодня ${today}.\n\nАнонс организатора:\n${raw}`, EVENT_SCHEMA),
  );
  if (!parsed.success) throw new Error('Ответ Gemini не совпал со схемой');
  return parsed.data;
}

export async function interpretSearchGemini(
  system: string,
  query: string,
  today: string,
): Promise<SearchIntent> {
  const parsed = SearchIntentSchema.safeParse(
    await generate(system, `Сегодня ${today}.\n\nЗапрос: ${query}`, SEARCH_SCHEMA),
  );
  if (!parsed.success) throw new Error('Ответ Gemini не совпал со схемой');
  return parsed.data;
}
