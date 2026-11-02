import { vi } from 'vitest';

/** A stand-in for next/headers: one cookie jar and one set of request headers per test. */
export function fakeNext(ip = '10.1.1.1') {
  const jar = new Map<string, string>();
  const h = new Headers({ 'x-real-ip': ip });
  vi.doMock('next/headers', () => ({
    cookies: async () => ({
      get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
      set: (k: string, v: string) => { jar.set(k, v); },
      delete: (k: string) => { jar.delete(k); },
    }),
    headers: async () => h,
  }));
  return { jar, h };
}

/** Postgres for the tests that need real locking and SQL. They're skipped unless TEST_DATABASE_URL is set. */
export const TEST_DB = process.env.TEST_DATABASE_URL;
if (process.env.REQUIRE_DB_TESTS === '1' && !TEST_DB) throw new Error('Database integration tests are required in CI.');
if (TEST_DB && !/^\/awards_test(?:_[a-z0-9_]+)?$/.test(new URL(TEST_DB).pathname)) throw new Error('Tests require a disposable awards_test database.');

