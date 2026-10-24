'use client';

import { useRef, useState } from 'react';
import EventCard from '@/components/EventCard';
import type { EventCard as EventCardType } from '@/lib/types';
import type { SearchIntent } from '@/lib/ai-shape';

type Turn =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      text: string;
      events: EventCardType[];
      intent: SearchIntent;
      engine: 'claude' | 'gemini' | 'heuristic';
      relaxed: string | null;
    };

const EXAMPLES = [
  'Найди IT-встречу за городом на эти выходные',
  'Языковой клуб в центре до 500 сом',
  'Что есть для ребёнка 10 лет в субботу',
  'Бесплатный хакатон для студентов',
];

/** Чат-поиск: пользователь пишет обычными словами, ответ — подборка карточек. */
export default function AiSearchPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(query: string) {
    const text = query.trim();
    if (!text || loading) return;

    setTurns((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? 'Поиск не удался');
      const data = await response.json();
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          events: data.events,
          intent: data.intent,
          engine: data.engine,
          relaxed: data.relaxed,
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-190px)] flex-col px-5 pt-5">
      <div>
        <h1 className="t-display">AI-поиск</h1>
        <p className="t-small mt-2 text-muted">
          Напишите, что хотите, обычными словами — без фильтров и выпадающих списков.
        </p>
      </div>

      {turns.length === 0 && (
        <div className="mt-5 space-y-2.5">
          <p className="t-caps text-muted">попробуйте так</p>
          {EXAMPLES.map((text) => (
            <button
              key={text}
              onClick={() => ask(text)}
              className="card-quiet flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-raised"
            >
              <span className="t-small">{text}</span>
              <span className="shrink-0 text-muted">→</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex-1 space-y-5">
        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={i} className="rise flex justify-end">
              <p
                className="max-w-[85%] rounded-[20px] rounded-br-md px-4 py-3 text-[14px] font-medium text-[color:var(--on-accent)]"
                style={{ background: 'var(--accent)' }}
              >
                {turn.text}
              </p>
            </div>
          ) : (
            <div key={i} className="rise space-y-3.5">
              <div className="card-quiet max-w-[92%] rounded-[16px] rounded-bl-md p-4">
                <p className="t-small font-medium">{turn.text}</p>
                {turn.relaxed && (
                  <p className="mt-2 text-[12.5px] leading-snug" style={{ color: 'var(--warn)' }}>
                    {turn.relaxed}
                  </p>
                )}
                <Filters intent={turn.intent} engine={turn.engine} />
              </div>
              {turn.events.length > 0 && (
                <ul className="grid grid-cols-2 gap-3">
                  {turn.events.map((event) => (
                    <li key={event.id}>
                      <EventCard event={event} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start">
            <p
              className="typing card-quiet rounded-[16px] rounded-bl-md px-5 py-4 text-[20px] leading-none"
              style={{ color: 'var(--accent)' }}
            >
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </p>
          </div>
        )}
        {error && (
          <p
            className="rounded-2xl px-4 py-3 text-[13.5px]"
            style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
          >
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 -mx-5 mt-5 flex gap-2 border-t border-line bg-page/95 px-5 py-4 backdrop-blur-xl"
        style={{ boxShadow: 'var(--shadow-float)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Книжный клуб в выходные…"
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length < 2}
          className="btn-primary px-4"
        >
          Спросить
        </button>
      </form>
    </div>
  );
}

/** Показывает, во что ассистент превратил запрос — это объясняет результат. */
function Filters({ intent, engine }: { intent: SearchIntent; engine: 'claude' | 'gemini' | 'heuristic' }) {
  const chips: string[] = [];
  if (intent.categories.length) chips.push(...intent.categories);
  if (intent.districts.length) chips.push(...intent.districts);
  if (intent.free_only) chips.push('бесплатно');
  else if (intent.max_price) chips.push(`до ${intent.max_price} сом`);
  if (intent.age) chips.push(`возраст ${intent.age}`);
  if (intent.date_from) {
    chips.push(
      intent.date_to && intent.date_to !== intent.date_from
        ? `${intent.date_from} → ${intent.date_to}`
        : intent.date_from,
    );
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="t-caps mb-2 text-muted">
        {engine === 'heuristic'
          ? 'разобрано как'
          : `${engine === 'claude' ? 'Claude' : 'Gemini'} разобрал как`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.length > 0 ? (
          chips.map((c) => (
            <span
              key={c}
              className="badge"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {c}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-muted">без жёстких фильтров</span>
        )}
      </div>
    </div>
  );
}
