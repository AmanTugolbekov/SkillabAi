// Переносит локальную базу в Turso: схема + все строки.
// Запуск: npm run db:push   (нужны TURSO_DATABASE_URL и TURSO_AUTH_TOKEN)
import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localFile = path.join(root, 'data', 'eventsphere.db');

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.error('Не задан TURSO_DATABASE_URL. Добавьте его в .env.local и повторите.');
  process.exit(1);
}
if (!existsSync(localFile)) {
  console.error('Локальной базы нет. Сначала выполните npm run seed.');
  process.exit(1);
}

const remote = createClient({ url, authToken });
const local = new DatabaseSync(localFile);

// Комментарии убираем до разбиения: внутри них встречается точка с запятой.
// PRAGMA в облачной базе не нужен и не поддерживается.
const schema = readFileSync(path.join(root, 'lib', 'schema.sql'), 'utf8')
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s && !/^PRAGMA/i.test(s));

for (const statement of schema) {
  await remote.execute(statement);
}
console.log(`Схема применена: ${schema.length} выражений.`);

// CREATE TABLE IF NOT EXISTS не добавляет колонки в существующую таблицу,
// поэтому изменения схемы догоняем отдельно. Повторный запуск безвреден:
// про уже существующую колонку SQLite просто ругается, и мы это пропускаем.
const MIGRATIONS = ['ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0'];

for (const statement of MIGRATIONS) {
  try {
    await remote.execute(statement);
    console.log(`Колонка добавлена: ${statement}`);
  } catch (error) {
    if (!/duplicate column/i.test(String(error))) throw error;
  }
}

// Порядок важен: сначала то, на что ссылаются внешние ключи.
const TABLES = ['registrations', 'events', 'organizers', 'users'];

// Старые строки убираем, чтобы облачная база совпала с локальной.
for (const table of TABLES) {
  await remote.execute(`DELETE FROM ${table}`);
}

for (const table of [...TABLES].reverse()) {
  const rows = local.prepare(`SELECT * FROM ${table}`).all();
  if (rows.length === 0) {
    console.log(`${table}: пусто`);
    continue;
  }
  const columns = Object.keys(rows[0]);
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

  // Пакетами, чтобы не делать по запросу на строку.
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH).map((row) => ({
      sql,
      args: columns.map((c) => row[c] ?? null),
    }));
    await remote.batch(chunk, 'write');
  }
  console.log(`${table}: перенесено ${rows.length}`);
}

local.close();
console.log('Готово. База в Turso совпадает с локальной.');
