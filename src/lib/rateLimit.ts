import { db, hasDb } from './db';

/**
 * The contact form's limit: 5 sends per address and 30 in total per hour. The total keeps a flood from using up
 * the Resend quota. It counts in the database, which every server instance shares; without one it counts in
 * this instance's memory, which is weaker but still slows a single script down.
 */
export const PER_IP = 5;
export const TOTAL = 30;
const HOUR = 3600e3;

const mem: { ip: string; at: number }[] = [];

export async function allowContact(ip: string): Promise<boolean> {
  if (hasDb) {
    // one transaction holding a lock, so two sends at the same moment can't both take the last slot. Errors are
    // thrown, not swallowed: the route answers 503 and sends nothing when the count can't be checked.
    return db().begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('contact_attempts'))`;
      const [{ mine, all }] = await tx<{ mine: number; all: number }[]>`
        SELECT count(*) FILTER (WHERE ip_hash = ${ip})::int AS mine, count(*)::int AS all
        FROM contact_attempts WHERE at > now() - interval '1 hour'`;
      if (mine >= PER_IP || all >= TOTAL) return false;
      await tx`INSERT INTO contact_attempts (ip_hash) VALUES (${ip})`;
      await tx`DELETE FROM contact_attempts WHERE at < now() - interval '1 day'`;
      return true;
    });
  }
  const now = Date.now();
  while (mem.length > 0 && mem[0].at < now - HOUR) mem.shift();
  if (mem.filter((a) => a.ip === ip).length >= PER_IP || mem.length >= TOTAL) return false;
  mem.push({ ip, at: now });
  return true;
}

