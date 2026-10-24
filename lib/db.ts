import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'eventsphere.db');

// Next.js пересобирает модули в dev, поэтому соединение держим на globalThis.
const g = globalThis as unknown as { __db?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__db) {
    mkdirSync(DB_DIR, { recursive: true });
    const conn = new DatabaseSync(DB_PATH);
    conn.exec(readFileSync(path.join(process.cwd(), 'lib', 'schema.sql'), 'utf8'));
    g.__db = conn;
  }
  return g.__db;
}

export function all<T>(sql: string, params: unknown[] = []): T[] {
  return db().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T>(sql: string, params: unknown[] = []): T | undefined {
  return db().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, params: unknown[] = []) {
  return db().prepare(sql).run(...(params as never[]));
}
