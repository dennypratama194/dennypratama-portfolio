import { cookies } from 'next/headers';
import { db, hasDb } from '@/lib/db';
import { CASES } from '@/lib/cases';
import { readJson } from '@/lib/request';
import { ipHash, isBot } from '@/lib/visitor';
import { eventToken, newViewer, trackingConfigured, TRACK_PER_IP, TRACK_TOTAL, validEvent, validViewer, viewerHash, VIEWER_COOKIE } from '@/lib/tracking';

const PAGES = new Set(['home', 'blog', 'post', 'work', 'case', 'about', 'contact']);
const CASE_SLUGS = new Set(['dennypratama', ...CASES.map((c) => c.slug)]);
const ok = (extra: object = {}) => Response.json({ ok: true, ...extra });
const fail = (status: number) => Response.json({ ok: false }, { status });

export async function POST(req: Request) {
  if (!hasDb) return ok({ skipped: 'no-db' });
  const read = await readJson(req, 2_000);
  if (!read.ok) return fail(read.status);
  const b = read.body as Record<string, unknown> | null;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(400);
  const jar = await cookies();
  if (jar.get('dp_notrack')) return ok({ skipped: 'owner' });
  if (isBot(req.headers)) return ok({ skipped: 'bot' });
  if (!trackingConfigured()) return fail(503);

  const ending = b.end === true;
  const id = Number(b.id);
  const duration = Number(b.duration);
  let viewer = jar.get(VIEWER_COOKIE)?.value ?? '';
  if (ending) {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(duration) || duration <= 0 || duration >= 86400) return fail(400);
    if (!validEvent(b.token, id, viewer)) return fail(403);
  } else if (!validViewer(viewer)) {
    viewer = newViewer();
    jar.set(VIEWER_COOKIE, viewer, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/track', maxAge: 86400 });
  }

  const page = typeof b.page === 'string' ? b.page : '';
  const slug = (page === 'post' || page === 'case') && typeof b.slug === 'string' ? b.slug : null;
  if (!ending && (!PAGES.has(page) || (slug?.length ?? 0) > 200)) return fail(422);
  if (!ending && page === 'case' && !(slug && CASE_SLUGS.has(slug))) return fail(422);

  let ref: string | null = null;
  try {
    const host = new URL(String(b.ref ?? '')).hostname.replace(/^www\./, '');
    if (host && host !== new URL(req.url).hostname.replace(/^www\./, '')) ref = host.slice(0, 200);
  } catch { /* no external referrer */ }
  const c = req.headers.get('x-vercel-ip-country')?.toUpperCase() ?? '';
  const country = /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : null;
  const ip = ipHash(req.headers);
  const visitor = viewerHash(viewer);

  try {
    // Quota reservation, deduplication and insertion share one transaction across every server instance.
    return await db().begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtext('tracking_attempts'))`;
      const [{ mine, all }] = await tx<{ mine: number; all: number }[]>`
        SELECT count(*) FILTER (WHERE ip_hash = ${ip})::int AS mine, count(*)::int AS all
        FROM tracking_attempts WHERE at > now() - interval '5 minutes'`;
      if (mine >= TRACK_PER_IP || all >= TRACK_TOTAL) return fail(429);
      await tx`INSERT INTO tracking_attempts (ip_hash) VALUES (${ip})`;
      await tx`DELETE FROM tracking_attempts WHERE at < now() - interval '1 hour'`;

      if (ending) {
        await tx`UPDATE page_views SET time_on_page = LEAST(${duration}, ceil(extract(epoch FROM now() - viewed_at))::int + 5)
          WHERE id = ${id} AND visitor_hash = ${visitor} AND time_on_page IS NULL AND viewed_at > now() - interval '2 hours'`;
        return ok();
      }
      if (page === 'post') {
        const [live] = slug ? await tx`SELECT 1 FROM posts WHERE slug = ${slug} AND status = 'published' AND published_at <= now()` : [];
        if (!live) return fail(422);
      }
      const [seen] = await tx`SELECT 1 FROM page_views
        WHERE visitor_hash = ${visitor} AND page_type = ${page} AND post_slug IS NOT DISTINCT FROM ${slug}
          AND viewed_at > now() - interval '30 minutes' LIMIT 1`;
      if (seen) return ok({ skipped: 'repeat' });
      const [row] = await tx<{ id: string }[]>`INSERT INTO page_views (page_type, post_slug, ip_hash, visitor_hash, country, referrer)
        VALUES (${page}, ${slug}, ${ip}, ${visitor}, ${country}, ${ref}) RETURNING id`;
      const viewId = Number(row.id);
      return ok({ id: viewId, token: eventToken(viewId, viewer) });
    });
  } catch {
    // Analytics must not fail open or expose database errors to a public client.
    return fail(503);
  }
}

