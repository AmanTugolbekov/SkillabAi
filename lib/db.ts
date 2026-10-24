import { createClient, type Client } from '@libsql/client';
import path from 'node:path';

/**
 * Слой доступа к базе.
 *
 * На Vercel файловая система у каждого экземпляра функции своя, поэтому
 * SQLite-файл там не годится: запись уходит в один экземпляр, а читает
 * другой. Вместо файла используем Turso — тот же SQLite, но общий для всех
 * экземпляров. Локально, когда переменные Turso не заданы, клиент работает
 * с обычным файлом в data/, и ничего настраивать не нужно.
 */
function localFileUrl() {
  const file = path.join(process.cwd(), 'data', 'eventsphere.db');
  return `file:${file.split(path.sep).join('/')}`;
}

const g = globalThis as unknown as { __db?: Client };

export function db(): Client {
  if (!g.__db) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    g.__db = url
      ? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
      : createClient({ url: localFileUrl() });
  }
  return g.__db;
}

/** true, когда данные лежат в общей облачной базе, а не в локальном файле. */
export function isShared() {
  return Boolean(process.env.TURSO_DATABASE_URL?.trim());
}

export async function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await db().execute({ sql, args: params as never[] });
  return result.rows as unknown as T[];
}

export async function one<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: unknown[] = []) {
  const result = await db().execute({ sql, args: params as never[] });
  return { lastInsertRowid: result.lastInsertRowid, changes: result.rowsAffected };
}
