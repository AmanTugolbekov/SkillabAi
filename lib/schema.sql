PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT,
  -- scrypt-хеш пароля; NULL у тех, кто входит только через Google,
  -- и у детских профилей, которые вообще не логинятся
  password_hash TEXT,
  -- идентификатор аккаунта Google (поле sub из id_token)
  google_sub    TEXT,
  birth_year    INTEGER NOT NULL,
  city          TEXT    NOT NULL DEFAULT 'Бишкек',
  avatar        TEXT    NOT NULL DEFAULT '🙂',
  -- NULL для самостоятельного аккаунта; id родителя для детского профиля
  parent_id     INTEGER REFERENCES users(id),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS organizers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id),
  display_name    TEXT    NOT NULL,
  about           TEXT    NOT NULL DEFAULT '',
  -- none | pending | verified | rejected
  kyc_status      TEXT    NOT NULL DEFAULT 'none',
  kyc_doc_type    TEXT,
  kyc_doc_last4   TEXT,
  kyc_full_name   TEXT,
  kyc_note        TEXT,
  kyc_submitted_at TEXT,
  kyc_reviewed_at TEXT,
  rating          REAL    NOT NULL DEFAULT 0,
  reviews_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  organizer_id  INTEGER NOT NULL REFERENCES organizers(id),
  title         TEXT    NOT NULL,
  summary       TEXT    NOT NULL DEFAULT '',
  category      TEXT    NOT NULL,
  format        TEXT    NOT NULL DEFAULT 'offline',   -- offline | online | hybrid
  city          TEXT    NOT NULL DEFAULT 'Бишкек',
  district      TEXT    NOT NULL DEFAULT '',          -- Центр, За городом, ...
  venue         TEXT    NOT NULL DEFAULT '',
  price         INTEGER NOT NULL DEFAULT 0,           -- в сомах, 0 = бесплатно
  starts_at     TEXT    NOT NULL,
  ends_at       TEXT,
  deadline_at   TEXT,
  min_age       INTEGER NOT NULL DEFAULT 0,
  max_age       INTEGER NOT NULL DEFAULT 99,
  capacity      INTEGER NOT NULL DEFAULT 0,           -- 0 = без лимита
  cover          TEXT   NOT NULL DEFAULT '🎉',
  -- структурированные блоки, которые собирает AI-копирайтер (JSON-массивы строк)
  timing        TEXT    NOT NULL DEFAULT '[]',
  requirements  TEXT    NOT NULL DEFAULT '[]',
  perks         TEXT    NOT NULL DEFAULT '[]',
  tags          TEXT    NOT NULL DEFAULT '[]',
  details       TEXT    NOT NULL DEFAULT '',
  -- требует подтверждения родителя при регистрации ребёнка
  featured      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS registrations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL REFERENCES events(id),
  -- кто идёт на ивент (может быть детский профиль)
  attendee_id   INTEGER NOT NULL REFERENCES users(id),
  -- кто нажал кнопку (родитель или сам участник)
  booked_by_id  INTEGER NOT NULL REFERENCES users(id),
  -- awaiting_parent | confirmed | cancelled
  status        TEXT    NOT NULL DEFAULT 'confirmed',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (event_id, attendee_id)
);

-- Почта уникальна среди тех, у кого она есть: в SQLite несколько NULL
-- уникальному индексу не мешают, а детские профили как раз без почты.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email  ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_starts   ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_regs_attendee   ON registrations(attendee_id);
