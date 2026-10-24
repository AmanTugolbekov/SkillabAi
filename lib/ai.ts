/**
 * AI-слой EventSphere. Две функции:
 *   structureEvent  — превращает сплошной текст организатора в структуру;
 *   interpretSearch — превращает запрос на естественном языке в фильтры.
 *
 * Есть ANTHROPIC_API_KEY — работает Claude. Нет — работают эвристики из
 * lib/ai-fallback.ts. Вызывающему коду разница не видна, кроме поля `engine`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { EventDraftSchema, SearchIntentSchema } from './ai-shape';
import type { EventDraft, SearchIntent } from './ai-shape';
import { structureEventFallback, interpretSearchFallback } from './ai-fallback';
import { geminiEnabled, interpretSearchGemini, structureEventGemini } from './ai-gemini';
import { CATEGORIES, DISTRICTS } from './types';

export type Engine = 'claude' | 'gemini' | 'heuristic';
export type AiResult<T> = { data: T; engine: Engine; note?: string };

const MODEL = 'claude-opus-5-5';

function claudeEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Есть ли вообще языковая модель — любая. */
export function aiEnabled() {
  return claudeEnabled() || geminiEnabled();
}

/** Что показать в профиле. */
export function engineLabel(): string {
  if (claudeEnabled()) return 'Claude';
  if (geminiEnabled()) return 'Gemini';
  return 'встроенные правила';
}

let client: Anthropic | null = null;
function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_HINT = CATEGORIES.map((c) => `${c.id} — ${c.label}`).join('; ');

const STRUCTURE_SYSTEM = `Ты редактор афиши молодёжных событий в Бишкеке (Кыргызстан).
Организатор присылает анонс одним куском текста. Твоя работа — разложить его
по полям, ничего не придумывая: если данных нет, оставляй пустую строку, null
или 0. Пиши по-русски, в том же тоне, что и автор, но убирай воду и повторы.

Правила:
— timing: пункты программы, каждый начинается со времени («18:00 — разбор»).
— requirements: что участник должен иметь, знать или принести.
— perks: что он получает — что включено в цену, призы, материалы.
— details: важное, что не влезло в блоки выше. Не дублируй уже разложенное.
— Категории: ${CATEGORY_HINT}.
— Районы: ${DISTRICTS.join(', ')}. Онлайн-событию ставь район «Онлайн».
— Цена в сомах, числом. «Бесплатно» — это 0.
— Даты приводи к YYYY-MM-DD HH:MM. Год не указан — бери ближайший будущий.`;

const SEARCH_SYSTEM = `Ты поисковый ассистент приложения с локальными событиями
в Бишкеке. Пользователь пишет запрос обычными словами. Разложи его в фильтры.

— Пустой фильтр значит «не важно»: не угадывай того, чего в запросе нет.
— keywords: только значимые слова для текстового поиска, без предлогов.
— «на выходные» — ближайшие суббота и воскресенье, диапазоном дат.
— Категории: ${CATEGORY_HINT}.
— Районы: ${DISTRICTS.join(', ')}.
— reply: одна дружелюбная фраза по-русски о том, как ты понял запрос.`;

/** Разбирает текст организатора на поля ивента. */
export async function structureEvent(raw: string): Promise<AiResult<EventDraft>> {
  if (geminiEnabled() && !claudeEnabled()) {
    try {
      return { data: await structureEventGemini(STRUCTURE_SYSTEM, raw, today()), engine: 'gemini' };
    } catch (error) {
      return {
        data: structureEventFallback(raw),
        engine: 'heuristic',
        note: `Gemini недоступен (${(error as Error).message}), разобрано по правилам.`,
      };
    }
  }
  if (!claudeEnabled()) {
    return { data: structureEventFallback(raw), engine: 'heuristic' };
  }
  try {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: STRUCTURE_SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(EventDraftSchema) },
      messages: [{ role: 'user', content: `Сегодня ${today()}.\n\nАнонс организатора:\n${raw}` }],
    });
    if (!response.parsed_output) throw new Error('пустой разбор');
    return { data: response.parsed_output, engine: 'claude' };
  } catch (error) {
    // Падать на демо нельзя: отдаём эвристику и честно сообщаем почему.
    return {
      data: structureEventFallback(raw),
      engine: 'heuristic',
      note: `Claude недоступен (${(error as Error).message}), разобрано по правилам.`,
    };
  }
}

/** Превращает запрос на естественном языке в фильтры каталога. */
export async function interpretSearch(query: string): Promise<AiResult<SearchIntent>> {
  if (geminiEnabled() && !claudeEnabled()) {
    try {
      return { data: await interpretSearchGemini(SEARCH_SYSTEM, query, today()), engine: 'gemini' };
    } catch {
      return { data: interpretSearchFallback(query), engine: 'heuristic' };
    }
  }
  if (!claudeEnabled()) {
    return { data: interpretSearchFallback(query), engine: 'heuristic' };
  }
  try {
    const response = await anthropic().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SEARCH_SYSTEM,
      output_config: { effort: 'low', format: zodOutputFormat(SearchIntentSchema) },
      messages: [{ role: 'user', content: `Сегодня ${today()}.\n\nЗапрос: ${query}` }],
    });
    if (!response.parsed_output) throw new Error('пустой разбор');
    return { data: response.parsed_output, engine: 'claude' };
  } catch {
    return { data: interpretSearchFallback(query), engine: 'heuristic' };
  }
}
