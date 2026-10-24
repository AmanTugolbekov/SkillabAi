import type { KycStatus } from '@/lib/types';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

const TONE: Record<Tone, React.CSSProperties> = {
  neutral: { background: 'var(--raised)', color: 'var(--text-soft)' },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  ok: { background: 'var(--ok-soft)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  bad: { background: 'var(--bad-soft)', color: 'var(--bad)' },
};

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className="badge" style={TONE[tone]}>
      {children}
    </span>
  );
}

const KYC: Record<KycStatus, { label: string; tone: Tone; mark: string }> = {
  verified: { label: 'Документы проверены', tone: 'ok', mark: '✓' },
  pending: { label: 'Проверка идёт', tone: 'warn', mark: '⋯' },
  rejected: { label: 'Проверку не прошёл', tone: 'bad', mark: '!' },
  none: { label: 'Без проверки', tone: 'neutral', mark: '–' },
};

export function KycBadge({ status, compact = false }: { status: KycStatus; compact?: boolean }) {
  const look = KYC[status];
  if (compact) {
    return (
      <span
        className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[10px] font-bold leading-none"
        style={TONE[look.tone]}
        title={look.label}
      >
        {look.mark}
      </span>
    );
  }
  return (
    <span className="badge" style={TONE[look.tone]}>
      <span>{look.mark}</span>
      {look.label}
    </span>
  );
}

/** Полоса заполненности мест. */
export function Capacity({ taken, capacity }: { taken: number; capacity: number }) {
  if (capacity === 0) {
    return <p className="text-[13.5px] text-muted">{taken} участников · мест хватит всем</p>;
  }
  const ratio = Math.min(1, taken / capacity);
  const tight = ratio >= 0.85;

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between text-[13.5px]">
        <span className="font-semibold">
          {taken} из {capacity} мест
        </span>
        {tight && (
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>
            почти разобрали
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(4, ratio * 100)}%`, background: 'var(--accent)' }}
        />
      </div>
    </div>
  );
}
