import Link from 'next/link';
import { submitKycAction } from '@/app/actions';
import { KycBadge } from '@/components/Badges';
import { ensureOrganizer } from '@/lib/queries';
import { currentUser } from '@/lib/session';
import { formatDateTime } from '@/lib/format';

const inputClass = 'field';

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; needed?: string }>;
}) {
  const { sent, needed } = await searchParams;
  const user = await currentUser();
  const organizer = ensureOrganizer(user.id);

  return (
    <div className="px-5 pt-5">
      <h1 className="t-display">Верификация</h1>
      <p className="t-small mt-2 text-muted">
        Один раз подтверждаете личность по документу — после этого можно собирать взносы, а у
        участников появляется, к кому предъявить претензию.
      </p>

      <div className="card mt-5 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="t-small font-bold">Текущий статус</p>
          {organizer.kyc_submitted_at && (
            <p className="mt-0.5 text-[12px] text-muted">
              заявка от {formatDateTime(organizer.kyc_submitted_at)}
            </p>
          )}
        </div>
        <KycBadge status={organizer.kyc_status} />
      </div>

      {needed === '1' && (
        <p
          className="mt-4 rounded-2xl px-4 py-3 text-[13px] leading-snug"
          style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          Событие с платным участием сохранить нельзя, пока личность не подтверждена. Пройдите
          проверку — или опубликуйте событие бесплатным.
        </p>
      )}

      {sent === '1' && organizer.kyc_status === 'pending' && (
        <p
          className="mt-4 rounded-2xl px-4 py-3 text-[13px] leading-snug"
          style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}
        >
          Заявка отправлена. Проверку выполняет модератор — в демо её можно пройти на экране{' '}
          <Link href="/admin" className="underline">
            модерации
          </Link>
          .
        </p>
      )}

      {organizer.kyc_status === 'rejected' && organizer.kyc_note && (
        <p
          className="mt-4 rounded-2xl px-4 py-3 text-[13px]"
          style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
        >
          Причина отказа: {organizer.kyc_note}
        </p>
      )}

      {organizer.kyc_status === 'verified' ? (
        <div className="mt-4 rounded-[20px] p-5" style={{ background: 'var(--ok-soft)' }}>
          <p className="t-section" style={{ color: 'var(--ok)' }}>
            Личность подтверждена
          </p>
          <p className="t-small mt-1.5" style={{ color: 'var(--ok)' }}>
            {organizer.kyc_full_name} · документ ••••{organizer.kyc_doc_last4}
            <br />
            Проверено {formatDateTime(organizer.kyc_reviewed_at)}. Можно публиковать платные
            события и принимать взносы.
          </p>
          <Link
            href="/organizer/new"
            className="btn-primary mt-4 w-full"
          >
            Создать событие
          </Link>
        </div>
      ) : (
        <form action={submitKycAction} className="mt-4 space-y-3.5">
          <label className="block">
            <span className="field-label">ФИО как в документе</span>
            <input
              name="full_name"
              required
              defaultValue={organizer.kyc_full_name ?? user.name}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="field-label">Тип документа</span>
            <select name="doc_type" defaultValue={organizer.kyc_doc_type ?? 'passport'} className={inputClass}>
              <option value="passport">Паспорт</option>
              <option value="id">ID-карта</option>
              <option value="birth_certificate">Свидетельство о рождении (для 14–16 лет)</option>
            </select>
          </label>

          <label className="block">
            <span className="field-label">Номер документа</span>
            <input
              name="doc_number"
              required
              minLength={4}
              placeholder="AN1234567"
              className={inputClass}
            />
            <span className="mt-1.5 block text-[12px] leading-snug text-muted">
              В прототипе сохраняются только последние 4 цифры — полный номер нигде не хранится.
              В продакшене здесь будет провайдер проверки документов.
            </span>
          </label>

          <label className="block">
            <span className="field-label">
              Чем занимаетесь — это увидят участники
            </span>
            <textarea
              name="about"
              rows={3}
              defaultValue={organizer.about}
              placeholder="Организую походы и поездки по Кыргызстану для студентов."
              className={inputClass}
            />
          </label>

          <div className="rounded-2xl border border-dashed border-line-strong bg-raised px-4 py-6 text-center">
            <p className="text-[24px] leading-none">📄</p>
            <p className="t-small mt-2 font-semibold">Фото документа</p>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">
              Загрузка файла и распознавание — следующий этап. Для проверки логики достаточно
              введённых данных.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
          >
            Отправить на проверку
          </button>
        </form>
      )}
    </div>
  );
}
