'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  cancelRegistration, confirmRegistration, createEvent, ensureOrganizer,
  register, reviewKyc, submitKyc,
} from '@/lib/queries';
import { currentUser, setCurrentUser, setRole, setTheme } from '@/lib/session';
import type { EventDraft } from '@/lib/ai-shape';

export async function switchRoleAction(formData: FormData) {
  const role = formData.get('role') === 'organizer' ? 'organizer' : 'guest';
  await setRole(role);
  if (role === 'organizer') {
    const user = await currentUser();
    ensureOrganizer(user.id);
  }
  redirect(role === 'organizer' ? '/organizer' : '/');
}

export async function switchUserAction(formData: FormData) {
  const id = Number(formData.get('user_id'));
  if (Number.isFinite(id) && id > 0) await setCurrentUser(id);
  revalidatePath('/', 'layout');
  redirect('/profile');
}

export async function registerAction(formData: FormData) {
  const eventId = Number(formData.get('event_id'));
  const attendeeId = Number(formData.get('attendee_id'));
  const user = await currentUser();
  const outcome = register(eventId, attendeeId || user.id, user.id);

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
  const user = await currentUser();
  confirmRegistration(Number(formData.get('registration_id')), user.id);
  revalidatePath('/my');
}

export async function cancelRegistrationAction(formData: FormData) {
  cancelRegistration(Number(formData.get('registration_id')));
  revalidatePath('/my');
}

export async function submitKycAction(formData: FormData) {
  const user = await currentUser();
  const organizer = ensureOrganizer(user.id);
  submitKyc(organizer.id, {
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
  reviewKyc(
    Number(formData.get('organizer_id')),
    formData.get('decision') === 'approve',
    String(formData.get('note') ?? ''),
  );
  revalidatePath('/admin');
  revalidatePath('/organizer/kyc');
}

/** Сохраняет ивент. Черновик приходит из AI-формы одним JSON-полем. */
export async function createEventAction(formData: FormData) {
  const user = await currentUser();
  const organizer = ensureOrganizer(user.id);

  const draft = JSON.parse(String(formData.get('draft'))) as EventDraft;

  // Платный сбор — только после подтверждения личности. Это и есть обещание
  // участнику: деньги просит тот, кого можно найти.
  if (draft.price > 0 && organizer.kyc_status !== 'verified') {
    redirect('/organizer/kyc?needed=1');
  }

  const id = createEvent(organizer.id, draft);

  revalidatePath('/organizer');
  revalidatePath('/');
  redirect(`/event/${id}?new=1`);
}

export async function toggleThemeAction(formData: FormData) {
  await setTheme(formData.get('theme') === 'dark' ? 'dark' : 'light');
  revalidatePath('/', 'layout');
}
