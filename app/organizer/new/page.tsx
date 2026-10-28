'use client';

import { useState } from 'react';
import { createEventAction } from '@/app/actions';
import VoiceInput from '@/components/VoiceInput';
import type { EventDraft } from '@/lib/ai-shape';
import { CATEGORIES, DISTRICTS } from '@/lib/types';

const SAMPLE = `Народ, в эту субботу 14 ноября собираемся на пикник в Ботаническом саду, сбор в 13:00 у входа с Ахунбаева. Взнос 250 сом на уголь и воду, еда в складчину — принесите что-нибудь к общему столу. Будет мангал, колонка, фрисби. Расходимся часов в 18, уберём за собой. Если идёте — напишите до пятницы вечером, чтобы я понимал количество. Можно с 16 лет.`;

const EMPTY: EventDraft = {
  title: '', summary: '', category: 'club', format: 'offline', district: 'Центр',
  venue: '', price: 0, starts_at: '', ends_at: null, deadline_at: null,
  min_age: 0, max_age: 99, capacity: 0, cover: '🎉',
  timing: [], requirements: [], perks: [], tags: [], details: '',
};

/** Экран «создать ивент»: сплошной текст → структура → публикация. */
export default function NewEventPage() {
  const [raw, setRaw] = useState('');
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [engine, setEngine] = useState<'claude' | 'gemini' | 'heuristic' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function structure() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Не удалось разобрать текст');
      setDraft(data.draft);
      setEngine(data.engine);
      setNote(data.note ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="px-5 pt-5">
      <h1 className="t-display">Новое событие</h1>
      <p className="t-small mt-2 text-muted">
        Напишите анонс как привыкли — одним куском. AI разложит его по полям, а вы проверите и
        поправите.
      </p>

      <div className="card mt-5 p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <label className="t-label text-muted">Текст анонса</label>
          <button
            onClick={() => setRaw(SAMPLE)}
            className="text-[12.5px] font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            вставить пример
          </button>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder="В субботу собираемся на пикник, сбор в 13:00 у входа, взнос 250 сом…"
          className="field resize-y leading-relaxed"
        />

        {/* Анонс длинный и с паузами, поэтому слушаем, пока не остановят,
            и дописываем к тому, что уже набрано. */}
        <div className="mt-2.5 flex items-center gap-3">
          <VoiceInput
            onText={(text, isFinal) => {
              if (isFinal) setRaw((prev) => (prev ? `${prev.trim()} ${text}` : text));
            }}
            title="Надиктовать анонс"
          />
          <p className="text-[12.5px] leading-snug text-muted">
            Можно надиктовать: нажмите микрофон, расскажите про событие своими словами и
            остановите запись.
          </p>
        </div>

        <button
          onClick={structure}
          disabled={loading || raw.trim().length < 20}
          className="btn-primary mt-3 w-full"
        >
          {loading ? 'AI разбирает текст…' : '✨ Структурировать с AI'}
        </button>
        {error && (
          <p
            className="mt-2.5 rounded-xl px-3.5 py-2.5 text-[12.5px]"
            style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
          >
            {error}
          </p>
        )}
      </div>

      {draft && (
        <form action={createEventAction} className="rise mt-5 space-y-3.5">
          <input type="hidden" name="draft" value={JSON.stringify(draft)} />

          <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--accent-soft)' }}>
            <p className="text-[12.5px] leading-snug" style={{ color: 'var(--accent)' }}>
              {engine === 'heuristic'
                ? 'Текст разобран встроенными правилами. Поля редактируются.'
                : `${engine === 'claude' ? 'Claude' : 'Gemini'} разобрал анонс на блоки. Проверьте поля — всё редактируется.`}
            </p>
            {note && (
              <p className="mt-1.5 text-[12px]" style={{ color: 'var(--warn)' }}>
                {note}
              </p>
            )}
          </div>

          <Field label="Заголовок">
            <input
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Короткое описание">
            <textarea
              value={draft.summary}
              onChange={(e) => set('summary', e.target.value)}
              rows={2}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Категория">
              <select
                value={draft.category}
                onChange={(e) => set('category', e.target.value as EventDraft['category'])}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Район">
              <select
                value={draft.district}
                onChange={(e) => set('district', e.target.value as EventDraft['district'])}
                className={inputClass}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Место сбора">
            <input
              value={draft.venue}
              onChange={(e) => set('venue', e.target.value)}
              placeholder="ул. Киевская 107"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Начало (ГГГГ-ММ-ДД ЧЧ:ММ)">
              <input
                value={draft.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Дедлайн записи">
              <input
                value={draft.deadline_at ?? ''}
                onChange={(e) => set('deadline_at', e.target.value || null)}
                placeholder="не обязательно"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Цена, сом">
              <input
                type="number"
                value={draft.price}
                onChange={(e) => set('price', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Возраст от">
              <input
                type="number"
                value={draft.min_age}
                onChange={(e) => set('min_age', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Возраст до">
              <input
                type="number"
                value={draft.max_age}
                onChange={(e) => set('max_age', Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>

          <div>
            <Field label="Лимит мест (0 — без лимита)">
              <input
                type="number"
                value={draft.capacity}
                onChange={(e) => set('capacity', Number(e.target.value))}
                className={inputClass}
              />
            </Field>

          </div>

          <ListField
            label="Программа"
            hint="по одному пункту на строку"
            items={draft.timing}
            onChange={(items) => set('timing', items)}
          />
          <ListField
            label="Что взять и знать"
            hint="требования к участнику"
            items={draft.requirements}
            onChange={(items) => set('requirements', items)}
          />
          <ListField
            label="Что входит"
            hint="включено в цену, призы, бонусы"
            items={draft.perks}
            onChange={(items) => set('perks', items)}
          />
          <ListField
            label="Теги"
            hint="по одному на строку"
            items={draft.tags}
            onChange={(items) => set('tags', items)}
          />

          <Field label="Подробности">
            <textarea
              value={draft.details}
              onChange={(e) => set('details', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDraft(EMPTY)}
              className="btn-secondary px-5 py-3 text-[14px]"
            >
              Очистить
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Опубликовать событие
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputClass = 'field py-2.5 text-[14px]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function ListField({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-muted">{label}</span>
        <span className="text-[11px] text-muted">{hint}</span>
      </span>
      <textarea
        value={items.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
        rows={Math.max(2, items.length + 1)}
        className={inputClass}
      />
    </label>
  );
}
