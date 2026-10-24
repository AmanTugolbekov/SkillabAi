import Link from 'next/link';
import { reviewKycAction } from '@/app/actions';
import { KycBadge } from '@/components/Badges';
import { allOrganizers } from '@/lib/queries';
import { formatDateTime } from '@/lib/format';
import { requireAdmin } from '@/lib/session';

/**
 * Экран модератора: тот, кто в реальной жизни смотрит документы.
 * В прототипе он нужен, чтобы показать весь путь KYC от заявки до допуска.
 */
export default async function AdminPage() {
  await requireAdmin();
  const organizers = await allOrganizers();
  const pending = organizers.filter((o) => o.kyc_status === 'pending');

  return (
    <div className="px-5 pt-5">
      <h1 className="t-display">Модерация</h1>
      <p className="t-small mt-2 text-muted">
        Служебный экран. Здесь проверяют документы: пока организатор не подтверждён, он не может
        собирать деньги.
      </p>

      <div className="card mt-4 flex items-center justify-around p-4 text-center">
        <div>
          <p className="text-[19px] font-extrabold leading-none" style={{ color: 'var(--warn)' }}>
            {pending.length}
          </p>
          <p className="mt-1.5 text-[11.5px] text-muted">на проверке</p>
        </div>
        <div className="h-8 w-px bg-line" />
        <div>
          <p className="text-[19px] font-extrabold leading-none">{organizers.length}</p>
          <p className="mt-1.5 text-[11.5px] text-muted">всего организаторов</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {organizers.map((o) => (
          <li key={o.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="t-section truncate">{o.display_name}</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {o.user_name} · {o.events} событий
                </p>
              </div>
              <KycBadge status={o.kyc_status} />
            </div>

            {o.about && <p className="t-small mt-2.5 text-ink-soft">{o.about}</p>}

            {o.kyc_status === 'none' ? (
              <p className="mt-3 text-[12.5px] text-muted">
                Заявку не подавал — публикует только бесплатные события.
              </p>
            ) : (
              <dl className="mt-3.5 space-y-2 border-t border-line pt-3.5 text-[12.5px]">
                <div className="flex gap-3">
                  <dt className="w-[92px] shrink-0 text-muted">По документу</dt>
                  <dd className="font-medium">{o.kyc_full_name ?? '—'}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-[92px] shrink-0 text-muted">Документ</dt>
                  <dd className="font-medium">
                    {o.kyc_doc_type === 'id'
                      ? 'ID-карта'
                      : o.kyc_doc_type === 'birth_certificate'
                        ? 'Свид. о рождении'
                        : 'Паспорт'}
                    {o.kyc_doc_last4 ? ` ••••${o.kyc_doc_last4}` : ''}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-[92px] shrink-0 text-muted">Заявка</dt>
                  <dd className="font-medium">{formatDateTime(o.kyc_submitted_at)}</dd>
                </div>
              </dl>
            )}

            {(o.kyc_status === 'pending' || o.kyc_status === 'rejected') && (
              <form action={reviewKycAction} className="mt-4 space-y-2.5">
                <input type="hidden" name="organizer_id" value={o.id} />
                <input name="note" placeholder="комментарий (для отказа)" className="field py-2.5" />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    className="btn-primary flex-1 px-4 py-2.5 text-[14px]"
                  >
                    Подтвердить
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="reject"
                    className="btn-secondary px-4 py-2.5 text-[14px]"
                    style={{ color: 'var(--bad)' }}
                  >
                    Отклонить
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>

      <Link href="/profile" className="mt-5 block text-center text-[13px] text-muted">
        ← назад в профиль
      </Link>
    </div>
  );
}
