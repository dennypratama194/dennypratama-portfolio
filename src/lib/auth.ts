import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { db, hasDb } from './db';
import { ipHash } from './visitor';

/**
 * One admin account. ADMIN_PASSWORD_HASH holds a scrypt hash of the password (the /admin/setup page makes it, as scrypt:salt:hash), and a
 * login sets an httpOnly cookie signed with SESSION_SECRET and tied to the current password hash, so a new password
 * signs every old session out (a new SESSION_SECRET does too). Each address can reserve five password checks in
 * 15 minutes, atomically across instances. Failures elsewhere never lock the owner out on a new browser.
 */
const COOKIE = 'dp_admin';
const WEEK = 7 * 24 * 3600;
const run = promisify(scrypt) as (pw: string, salt: Buffer, len: number, o: object) => Promise<Buffer>;

const secret = () => process.env.SESSION_SECRET ?? '';
export const authConfigured = () => !!process.env.ADMIN_PASSWORD_HASH && secret().length >= 32;

const mac = (s: string) => createHmac('sha256', secret()).update(s).digest('base64url');
// the password hash is part of what's signed, so changing it ends every session signed before
const sign = (exp: number) => mac(`admin.${exp}.${process.env.ADMIN_PASSWORD_HASH ?? ''}`);
const same = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

async function passwordOk(pw: string) {
  const [kind, salt, hash] = (process.env.ADMIN_PASSWORD_HASH ?? '').split(':');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const got = await run(pw, Buffer.from(salt, 'base64url'), 64, { N: 16384, r: 8, p: 1 });
  return same(got, Buffer.from(hash, 'base64url'));
}

/** The env lines the setup page hands to Denny */
export async function envLines(pw: string) {
  const salt = randomBytes(16);
  const hash = await run(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return [
    `ADMIN_PASSWORD_HASH=scrypt:${salt.toString('base64url')}:${hash.toString('base64url')}`,
    `SESSION_SECRET=${randomBytes(32).toString('base64url')}`,
    `CRON_SECRET=${randomBytes(32).toString('base64url')}`,
  ].join('\n');
}

export async function isAdmin() {
  if (!authConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value ?? '';
  const [exp, sig] = v.split('.');
  if (!exp || !sig || !Number.isSafeInteger(Number(exp)) || Number(exp) < Date.now() / 1000) return false;
  return same(Buffer.from(sig), Buffer.from(sign(Number(exp))));
}

/**
 * Every admin page and server action starts with this. The layout's check isn't enough: Next renders a page
 * alongside its layout, and on navigation between admin pages it can render the page alone. connection() keeps
 * every admin page per request, so no build ever prerenders admin data into a static file.
 */
export async function requireAdmin() {
  await connection();
  if (!(await isAdmin())) redirect('/admin/login');
}

export async function logIn(pw: string): Promise<string | null> {
  if (!authConfigured()) return 'Login is switched off until ADMIN_PASSWORD_HASH and SESSION_SECRET are set.';
  if (!pw || pw.length > 1024) return 'That password isn’t right.';
  if (!hasDb) return 'Sign-in is temporarily unavailable. Please try again shortly.';
  const ip = ipHash(await headers());
  try {
    const allowed = await db().begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('login_attempts'), hashtext(${ip}))`;
      const [{ mine }] = await tx<{ mine: number }[]>`SELECT count(*)::int AS mine FROM login_attempts
        WHERE ip_hash = ${ip} AND at > now() - interval '15 minutes'`;
      if (mine >= 5) return false;
      // Reserve before the expensive password check so concurrent guesses cannot all take the last slot.
      await tx`INSERT INTO login_attempts (ip_hash) VALUES (${ip})`;
      await tx`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`;
      return true;
    });
    if (!allowed) return 'Too many wrong passwords. Try again in 15 minutes.';
  } catch {
    return 'Sign-in is temporarily unavailable. Please try again shortly.';
  }
  if (!(await passwordOk(pw))) {
    return 'That password isn’t right.';
  }
  await db()`DELETE FROM login_attempts WHERE ip_hash = ${ip}`;

  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const jar = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  jar.set(COOKIE, `${exp}.${sign(exp)}`, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: WEEK });
  // Retire the old trusted-device exception; a new browser has the same recovery path as an old one.
  jar.set('dp_dev', '', { httpOnly: true, secure, sameSite: 'lax', path: '/admin', maxAge: 0 });
  // keeps Denny's own visits out of the page view numbers on this browser
  jar.set('dp_notrack', '1', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 365 * 24 * 3600 });
  return null;
}

export async function logOut() {
  (await cookies()).delete(COOKIE);
}

