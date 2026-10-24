import Link from 'next/link';
import { notFound } from 'next/navigation';
import { registerAction } from '@/app/actions';
import { Capacity, KycBadge, Pill } from '@/components/Badges';
import Avatar from '@/components/Avatar';
import { ageOf, childrenOf, getEvent, isChildAccount, organizerById, registrationFor } from '@/lib/queries';
import { currentUser } from '@/lib/session';
import { categoryLabel } from '@/lib/types';
import { photoFor } from '@/lib/photo';
import { ageLabel, ageText, deadlineLabel, formatDateTime, formatPrice } from '@/lib/format';

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="card-quiet p-4">
      <h2 className="t-section mb-2.5">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[14.5px] leading-[1.45] text-ink-soft">
            <span
              className="mt-[9px] h-1 w-1 shrink-0 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notice({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: React.ReactNode }) {
  return (
    <p
      className="mb-3 rounded-[12px] px-3.5 py-3 text-[13.5px] leading-snug"
      style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
    >
      {children}
    </p>
  );
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ r?: string; new?: string }>;
}) {
  const { id } = await params;
  const { r, new: isNew } = await searchParams;

  const event = await getEvent(Number(id));
  if (!event) notFound();

  const user = await currentUser();
  const organizer = await organizerById(event.organizer_id);
  const kids = user ? await childrenOf(user.id) : [];
  const deadline = deadlineLabel(event.deadline_at);
  const full = event.capacity > 0 && event.taken >= event.capacity;
  const mine = user ? await registrationFor(event.id, user.id) : undefined;
  const childProfile = user ? isChildAccount(user) : false;

  // Кандидаты на запись: сам пользователь и его дети, подходящие по возрасту.
  const candidates = (
    user
      ? [
          { id: user.id, name: `${user.name} (я)`, age: ageOf(user) },
          ...kids.map((k) => ({ id: k.id, name: k.name, age: ageOf(k) })),
        ]
      : []
  ).filter((c) => c.age >= event.min_age && c.age <= event.max_age);

  const paidButUnverified = event.price > 0 && event.kyc_status !== 'verified';

  return (
    <div>
      {/* Фотография на всю ширину — главный элемент экрана */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-raised">
        <img src={photoFor(event.id, event.category)} alt="" className="h-full w-full object-cover" />
        <div className="scrim absolute inset-0" />
        <Link
          href="/"
          className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-[17px] text-white backdrop-blur-sm"
          aria-label="Назад к афише"
        >
          ←
        </Link>
        <div className="absolute inset-x-4 bottom-4">
          <span className="badge bg-white/90 text-[color:#0f1014]">{categoryLabel(event.category)}</span>
          <h1
            className="mt-2.5 text-[26px] font-bold leading-[1.12] tracking-[-0.02em] text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {event.title}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {isNew === '1' && <Notice tone="ok">Событие опубликовано — так его видят участники.</Notice>}
        {r === 'ok' && <Notice tone="ok">Вы записаны. Запись появилась в разделе «Записи».</Notice>}
        {r === 'ok_parent' && (
          <Notice tone="warn">Заявка отправлена родителю — так работают детские профили.</Notice>
        )}
        {r?.startsWith('err:') && (
          <Notice tone="bad">Не получилось записаться: {decodeURIComponent(r.slice(4))}</Notice>
        )}

        <p className="t-body text-ink-soft">{event.summary}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill>{event.format === 'online' ? 'онлайн' : event.format === 'hybrid' ? 'гибрид' : 'офлайн'}</Pill>
          <Pill>{ageLabel(event.min_age, event.max_age)}</Pill>
          <Pill tone={event.price === 0 ? 'ok' : 'neutral'}>{formatPrice(event.price)}</Pill>
          {deadline && <Pill tone={deadline.urgent ? 'warn' : 'neutral'}>{deadline.text}</Pill>}
        </div>

        <div className="card-quiet mt-4 p-4">
          <dl className="space-y-3">
            <div className="flex gap-3">
              <dt className="w-[66px] shrink-0 text-[13px] text-muted">Когда</dt>
              <dd className="text-[14.5px] font-medium">
                {formatDateTime(event.starts_at)}
                {event.ends_at && (
                  <span className="block font-normal text-muted">до {formatDateTime(event.ends_at)}</span>
                )}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-[66px] shrink-0 text-[13px] text-muted">Где</dt>
              <dd className="text-[14.5px] font-medium">
                {event.venue || 'место уточняется'}
                <span className="block font-normal text-muted">{event.district}</span>
              </dd>
            </div>
            {event.deadline_at && (
              <div className="flex gap-3">
                <dt className="w-[66px] shrink-0 text-[13px] text-muted">Дедлайн</dt>
                <dd className="text-[14.5px] font-medium">{formatDateTime(event.deadline_at)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3.5 border-t border-line pt-3.5">
            <Capacity taken={event.taken} capacity={event.capacity} />
          </div>
        </div>

        {/* Организатор и доверие — ключевой блок для ответа «кому я плачу». */}
        <div className="card-quiet mt-3 p-4">
          <div className="flex items-start gap-3">
            <Avatar name={event.organizer_name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="t-section">{event.organizer_name}</p>
              {event.reviews_count > 0 && (
                <p className="mt-0.5 text-[13px] text-muted">
                  ★ {event.rating.toFixed(1)} · {event.reviews_count} отзывов
                </p>
              )}
              {organizer?.about && <p className="t-small mt-1.5 text-muted">{organizer.about}</p>}
            </div>
          </div>

          <div className="mt-3">
            <KycBadge status={event.kyc_status} />
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-muted">
            {event.kyc_status === 'verified'
              ? `Личность подтверждена по документу${organizer?.kyc_doc_last4 ? ` ••••${organizer.kyc_doc_last4}` : ''}. Взносы можно принимать через приложение.`
              : 'Организатор не прошёл проверку по документу. Платные сборы для него закрыты — только бесплатные события.'}
          </p>
        </div>

        <div className="mt-3 space-y-3">
          <Section title="Программа" items={event.timing} />
          <Section title="Что взять и знать" items={event.requirements} />
          <Section title="Что входит" items={event.perks} />
        </div>

        {event.details && (
          <div className="card-quiet mt-3 p-4">
            <h2 className="t-section mb-2">Подробности</h2>
            <p className="text-[14.5px] leading-[1.5] text-ink-soft">{event.details}</p>
          </div>
        )}

        {event.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {event.tags.map((t) => (
              <Pill key={t}>#{t}</Pill>
            ))}
          </div>
        )}
      </div>

      {/* Блок записи */}
      <div className="sticky bottom-0 mt-5 border-t border-line bg-page/95 px-4 py-3.5 backdrop-blur-xl">
        {!user ? (
          <Link href={`/login?next=${encodeURIComponent(`/event/${event.id}`)}`} className="btn-primary w-full">
            Войдите, чтобы записаться
          </Link>
        ) : mine ? (
          <p
            className="rounded-[12px] px-4 py-3 text-center text-[14px] font-semibold"
            style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}
          >
            {mine.status === 'awaiting_parent'
              ? 'Заявка ждёт подтверждения родителя'
              : 'Вы записаны на это событие'}
          </p>
        ) : full ? (
          <p
            className="rounded-[12px] px-4 py-3 text-center text-[14px] font-semibold"
            style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
          >
            Свободных мест нет
          </p>
        ) : deadline?.text === 'регистрация закрыта' ? (
          <p className="rounded-[12px] bg-raised px-4 py-3 text-center text-[14px] text-muted">
            Регистрация закрыта — дедлайн прошёл
          </p>
        ) : paidButUnverified ? (
          <p
            className="rounded-[12px] px-4 py-3 text-center text-[13.5px] font-medium"
            style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
          >
            Платная запись закрыта: организатор не проверен
          </p>
        ) : candidates.length === 0 ? (
          <p className="rounded-[12px] bg-raised px-4 py-3 text-center text-[13.5px] text-muted">
            Событие для {ageLabel(event.min_age, event.max_age)} — профиль не подходит по возрасту
          </p>
        ) : (
          <form action={registerAction} className="space-y-2">
            <input type="hidden" name="event_id" value={event.id} />
            {candidates.length > 1 ? (
              <select name="attendee_id" className="field py-2.5">
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    Записать: {c.name} · {ageText(c.age)}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="attendee_id" value={candidates[0].id} />
            )}
            <button type="submit" className="btn-primary w-full">
              {event.price === 0 ? 'Записаться' : `Записаться · ${formatPrice(event.price)}`}
            </button>
            <p className="text-center text-[11.5px] leading-snug text-muted">
              {childProfile
                ? 'Это детский профиль — заявку подтвердит родитель'
                : event.price > 0
                  ? 'Оплата на месте. Приём платежей в приложении — следующий этап.'
                  : 'Запись бесплатная'}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
