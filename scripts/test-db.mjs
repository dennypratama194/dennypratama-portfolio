import fs from 'node:fs/promises';
import postgres from 'postgres';

const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error('TEST_DATABASE_URL must point to a disposable awards_test database.');
const url = new URL(value);
if (!/^\/awards_test(?:_[a-z0-9_]+)?$/.test(url.pathname)) throw new Error('Refusing to run destructive tests outside an awards_test database.');
if (process.env.DATABASE_URL === value) throw new Error('TEST_DATABASE_URL must be separate from the application DATABASE_URL.');
const sql = postgres(value, { max: 1, onnotice: () => {} });
try {
  await sql.unsafe(await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  console.log('Disposable test schema ready.');
} finally { await sql.end(); }

