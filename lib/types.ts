export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type RegStatus = 'awaiting_parent' | 'confirmed' | 'cancelled';
export type EventFormat = 'offline' | 'online' | 'hybrid';

export type User = {
  id: number;
  name: string;
  email: string | null;
  password_hash: string | null;
  google_sub: string | null;
  birth_year: number;
  city: string;
  avatar: string;
  parent_id: number | null;
};

export type Organizer = {
  id: number;
  user_id: number;
  display_name: string;
  about: string;
  kyc_status: KycStatus;
  kyc_doc_type: string | null;
  kyc_doc_last4: string | null;
  kyc_full_name: string | null;
  kyc_note: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  rating: number;
  reviews_count: number;
};

/** Строка таблицы events: JSON-поля ещё не распарсены. */
export type EventRow = {
  id: number;
  organizer_id: number;
  title: string;
  summary: string;
  category: string;
  format: EventFormat;
  city: string;
  district: string;
  venue: string;
  price: number;
  starts_at: string;
  ends_at: string | null;
  deadline_at: string | null;
  min_age: number;
  max_age: number;
  capacity: number;
  cover: string;
  timing: string;
  requirements: string;
  perks: string;
  tags: string;
  details: string;
  featured: number;
};

export type EventCard = Omit<EventRow, 'timing' | 'requirements' | 'perks' | 'tags' | 'featured'> & {
  timing: string[];
  requirements: string[];
  perks: string[];
  tags: string[];
  featured: boolean;
  organizer_name: string;
  kyc_status: KycStatus;
  rating: number;
  reviews_count: number;
  taken: number;
};

export const CATEGORIES = [
  { id: 'hackathon', label: 'Хакатоны' },
  { id: 'education', label: 'Учёба и языки' },
  { id: 'club', label: 'Клубы' },
  { id: 'trip', label: 'Поездки' },
  { id: 'workshop', label: 'Воркшопы' },
  { id: 'sport', label: 'Спорт' },
  { id: 'creative', label: 'Творчество' },
] as const;

export const DISTRICTS = ['Центр', 'Юг', 'Запад', 'Восток', 'За городом', 'Онлайн'] as const;

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
