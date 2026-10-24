'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  cancelRegistration, confirmRegistration, createEvent, ensureOrganizer,
  register, reviewKyc, submitKyc,
} from '@/lib/queries';
import { currentUser, requireUser, setRole, setTheme } from '@/lib/session';
import type { EventDraft } from '@/lib/ai-shape';

export async function switchRoleAction(formData: FormData) {
  const role = formData.get('role') === 'organizer' ? 'organizer' : 'guest';
  await setRole(role);
  if (role === 'organizer') {
    const user = await requireUser('/organizer');
    await ensureOrganizer(user.id);
  }
  redirect(role === 'organizer' ? '/organizer' : '/');
}

export async function registerAction(formData: FormData) {
  const eventId = Number(formData.get('event_id'));
  const attendeeId = Number(formData.get('attendee_id'));
  const user = await requireUser(`/event/${eventId}`);
  const outcome = await register(eventId, attendeeId || user.id, user.id);

  revalidatePath(`/event/${eventId}`);
  revalidatePath('/my');
  revalidatePath('/');

  const message = outcome.ok
    ? outcome.status === 'awaiting_parent'
      ? 'ok_parent'
      : 'ok'
    : `err:${outcome.reason}`;
  redirect(`/event/${eventId}?r=${encodeURIComponent(message)}`);
}

export async function confirmRegistrationAction(formData: FormData) {
  const user = await requireUser('/my');
  await confirmRegistration(Number(formData.get('registration_id')), user.id);
  revalidatePath('/my');
}

export async function cancelRegistrationAction(formData: FormData) {
  await cancelRegistration(Number(formData.get('registration_id')));
  revalidatePath('/my');
}

export async function submitKycAction(formData: FormData) {
  const user = await requireUser('/organizer/kyc');
  const organizer = await ensureOrganizer(user.id);
  await submitKyc(organizer.id, {
    full_name: String(formData.get('full_name') ?? ''),
    doc_type: String(formData.get('doc_type') ?? 'passport'),
    doc_number: String(formData.get('doc_number') ?? ''),
    about: String(formData.get('about') ?? ''),
  });
  revalidatePath('/organizer/kyc');
  revalidatePath('/organizer');
  redirect('/organizer/kyc?sent=1');
}

export async function reviewKycAction(formData: FormData) {
  // Решение по документам принимает только модератор.
  const user = await requireUser('/admin');
  if (!user.is_admin) throw new Error('Нет прав на проверку документов');

  await reviewKyc(
    Number(formData.get('organizer_id')),
    formData.get('decision') === 'approve',
    String(formData.get('note') ?? ''),
  );
  revalidatePath('/admin');
  revalidatePath('/organizer/kyc');
}

/** Сохраняет ивент. Черновик приходит из AI-формы одним JSON-полем. */
export async function createEventAction(formData: FormData) {
  const user = await requireUser('/organizer/new');
  const organizer = await ensureOrganizer(user.id);

  const draft = JSON.parse(String(formData.get('draft'))) as EventDraft;

  // Платный сбор — только после подтверждения личности. Это и есть обещание
  // участнику: деньги просит тот, кого можно найти.
  if (draft.price > 0 && organizer.kyc_status !== 'verified') {
    redirect('/organizer/kyc?needed=1');
  }

  const id = await createEvent(organizer.id, draft);

  revalidatePath('/organizer');
  revalidatePath('/');
  redirect(`/event/${id}?new=1`);
}

export async function toggleThemeAction(formData: FormData) {
  await setTheme(formData.get('theme') === 'dark' ? 'dark' : 'light');
  revalidatePath('/', 'layout');
}
