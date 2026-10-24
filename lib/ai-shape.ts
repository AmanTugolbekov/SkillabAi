/** Формы данных, которые возвращает AI-слой. Разделены от lib/ai.ts, чтобы
 *  фоллбэк не тянул за собой SDK Anthropic. */
import { z } from 'zod';

export const EventDraftSchema = z.object({
  title: z.string().describe('Короткий заголовок события, до 90 символов'),
  summary: z.string().describe('Одно предложение о сути события, до 160 символов'),
  category: z.enum(['hackathon', 'education', 'club', 'trip', 'workshop', 'sport', 'creative']),
  format: z.enum(['offline', 'online', 'hybrid']),
  district: z.enum(['Центр', 'Юг', 'Запад', 'Восток', 'За городом', 'Онлайн']),
  venue: z.string().describe('Адрес или место сбора; пустая строка, если не указано'),
  price: z.number().int().describe('Цена участия в сомах, 0 если бесплатно'),
  starts_at: z.string().describe('Начало в формате YYYY-MM-DD HH:MM'),
  ends_at: z.string().nullable().describe('Окончание в формате YYYY-MM-DD HH:MM или null'),
  deadline_at: z.string().nullable().describe('Дедлайн регистрации YYYY-MM-DD HH:MM или null'),
  min_age: z.number().int().describe('Минимальный возраст, 0 если без ограничений'),
  max_age: z.number().int().describe('Максимальный возраст, 99 если без ограничений'),
  capacity: z.number().int().describe('Лимит участников, 0 если без лимита'),
  cover: z.string().describe('Один эмодзи, подходящий событию'),
  timing: z.array(z.string()).describe('Программа по пунктам, каждый пункт со временем'),
  requirements: z.array(z.string()).describe('Что нужно иметь или знать участнику'),
  perks: z.array(z.string()).describe('Что участник получает: включено в цену, призы, бонусы'),
  tags: z.array(z.string()).describe('2–4 коротких тега в нижнем регистре'),
  details: z.string().describe('Остальные детали, которые не попали в блоки выше'),
});

export type EventDraft = z.infer<typeof EventDraftSchema>;

export const SearchIntentSchema = z.object({
  reply: z.string().describe('Короткая фраза пользователю: как понят его запрос'),
  keywords: z.array(z.string()).describe('Ключевые слова для текстового поиска'),
  categories: z.array(z.enum(['hackathon', 'education', 'club', 'trip', 'workshop', 'sport', 'creative'])),
  districts: z.array(z.enum(['Центр', 'Юг', 'Запад', 'Восток', 'За городом', 'Онлайн'])),
  max_price: z.number().int().nullable().describe('Максимальная цена в сомах или null'),
  free_only: z.boolean().describe('true, если пользователь просит только бесплатные'),
  age: z.number().int().nullable().describe('Возраст участника, если упомянут'),
  date_from: z.string().nullable().describe('Начало диапазона YYYY-MM-DD или null'),
  date_to: z.string().nullable().describe('Конец диапазона YYYY-MM-DD или null'),
});

export type SearchIntent = z.infer<typeof SearchIntentSchema>;
