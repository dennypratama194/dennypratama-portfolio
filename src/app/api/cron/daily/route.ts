import { db, hasDb } from '@/lib/db';
import { getSettings, runAutoPost } from '@/lib/autopost';
import { refreshBlog } from '@/lib/revalidate';

/**
 * Vercel Cron calls this once a day (vercel.json, 01:00 UTC = 08:00 in Jakarta) with CRON_SECRET as a bearer token.
 * It puts scheduled posts live, and on the chosen weekdays has auto-post write one.
 */
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  if (!hasDb) return Response.json({ ok: false, error: 'DATABASE_URL is not set' }, { status: 503 });
  const sql = db();

  // scheduled posts whose time came since the last run: the static pages need refreshing to show them
  const [last] = await sql<{ value: string }[]>`SELECT value #>> '{}' AS value FROM settings WHERE key = 'cron_last'`;
  const [{ due }] = await sql<{ due: number }[]>`SELECT count(*)::int AS due FROM posts
    WHERE status = 'published' AND published_at <= now() AND published_at > ${last ? new Date(last.value) : new Date(0)}`;
  await sql`INSERT INTO settings (key, value) VALUES ('cron_last', ${sql.json(new Date().toISOString())})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  if (due > 0) refreshBlog();

  const s = await getSettings();
  // the day in Jakarta, where Denny is
  const jakarta = new Date(Date.now() + 7 * 3600e3);
  const day = jakarta.getUTCDay();
  const [{ today }] = await sql<{ today: number }[]>`SELECT count(*)::int AS today FROM auto_post_runs
    WHERE ok AND started_at > now() - interval '20 hours'`;
  const slot = `daily:${jakarta.toISOString().slice(0, 10)}`;
  const auto = s.enabled && s.days.includes(day) && today === 0 ? await runAutoPost(slot) : null;
  return Response.json({ ok: true, published: due, auto });
}

