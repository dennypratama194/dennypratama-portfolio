import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeNext } from './helpers';

// login_attempts counts come from here; inserts and deletes are ignored
const counts = { mine: 0, all: 0 };
const query = (strings: TemplateStringsArray) => Promise.resolve(strings.join('?').includes('count(*)') ? [{ ...counts }] : []);
vi.mock('@/lib/db', () => ({
  hasDb: true,
  db: () => Object.assign(query, { begin: (fn: (tx: typeof query) => unknown) => fn(query) }),
}));

async function load(ip?: string) {
  vi.resetModules();
  const next = fakeNext(ip);
  return { ...next, auth: await import('@/lib/auth') };
}

describe('admin login', () => {
  beforeEach(async () => {
    counts.mine = 0; counts.all = 0;
    vi.stubEnv('SESSION_SECRET', 's'.repeat(40));
    vi.resetModules();
    const { envLines } = await import('@/lib/auth');
    vi.stubEnv('ADMIN_PASSWORD_HASH', (await envLines('right horse battery')).split('\n')[0].split('=')[1]);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('logs in with the right password', async () => {
    const { auth } = await load();
    expect(await auth.logIn('right horse battery')).toBeNull();
    expect(await auth.isAdmin()).toBe(true);
  });

  it('locks out one address after five wrong passwords, even with the right one', async () => {
    counts.mine = 5; counts.all = 5;
    const { auth } = await load();
    expect(await auth.logIn('right horse battery')).toMatch(/Too many/);
  });

  it('the correct password works from a new browser despite failures at other addresses', async () => {
    counts.all = 1000;
    const fresh = await load('10.2.2.2');
    expect(fresh.jar.get('dp_dev')).toBeUndefined();
    expect(await fresh.auth.logIn('right horse battery')).toBeNull();
    expect(await fresh.auth.isAdmin()).toBe(true);
  });

  it('rejects oversized passwords before deriving a hash', async () => {
    const { auth } = await load();
    expect(await auth.logIn('x'.repeat(1025))).toMatch(/isn’t right/);
  });

  it('a new password ends sessions signed with the old one', async () => {
    const { auth, jar } = await load();
    expect(await auth.logIn('right horse battery')).toBeNull();
    const session = jar.get('dp_admin')!;

    vi.stubEnv('ADMIN_PASSWORD_HASH', (await auth.envLines('a new password')).split('\n')[0].split('=')[1]);
    const after = await load();
    after.jar.set('dp_admin', session);
    expect(await after.auth.isAdmin()).toBe(false);
  });
});

