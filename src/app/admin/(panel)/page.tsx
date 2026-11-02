import Link from 'next/link';
import { db } from '@/lib/db';
import { ImportViews } from './ImportViews';
import { Overview, type Day } from './Overview';
import { requireAdmin } from '@/lib/auth';

const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']] as const;
const PAGE_PATH: Record<string, string> = { home: '/', blog: '/blog', work: '/work', case: '/work/', about: '/about', contact: '/contact' };
const TZ = 'Asia/Jakarta';
const regions = new Intl.DisplayNames(['en'], { type: 'region' });
const num = (n: number) => n.toLocaleString('en-US');
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
// change against the period just before; null when there was nothing to compare with
const delta = (now: number | null, before: number | null) => (now === null || !before ? null : ((now - before) / before) * 100);

type Totals = { views: number; visitors: number; time: number | null; returning: number };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requireAdmin();
  const asked = Number((await searchParams).d);
  const d = RANGES.some(([r]) => r === asked) ? asked : 30;
  const sql = db();
  const unit = d > 90 ? 'week' : 'day'; // a year of daily points is noise, so the long view goes by week
  // the range starts at midnight in Indonesia, d - 1 days ago, so "7 days" means this week including today
  const day0 = sql`date_trunc('day', now() AT TIME ZONE ${TZ})`;
  const from = sql`(${day0} - ${d - 1} * interval '1 day') AT TIME ZONE ${TZ}`;
  const prev = sql`(${day0} - ${2 * d - 1} * interval '1 day') AT TIME ZONE ${TZ}`;
  const today = sql`${day0} AT TIME ZONE ${TZ}`;
  const totals = (a: typeof from, b: typeof from | null) => sql<Totals[]>`
    WITH r AS (SELECT * FROM page_views WHERE viewed_at >= ${a} ${b ? sql`AND viewed_at < ${b}` : sql``})
    SELECT count(*)::int AS views, count(DISTINCT ip_hash)::int AS visitors,
      (SELECT avg(time_on_page) FROM r WHERE time_on_page IS NOT NULL)::float AS time,
      (SELECT count(DISTINCT r.ip_hash) FROM r WHERE EXISTS
        (SELECT 1 FROM page_views o WHERE o.ip_hash = r.ip_hash AND o.viewed_at < ${a}))::int AS returning
    FROM r`;

  const [[imported], [now], [before], [extra], daily, posts, pages, refs, countries] = await Promise.all([
    sql`SELECT 1 FROM settings WHERE key = 'views_imported'`,
    totals(from, null),
    totals(prev, from),
    sql<{ today: number; today_visitors: number; all_time: number; avg_post: number | null }[]>`
      SELECT (SELECT count(*) FROM page_views WHERE viewed_at >= ${today})::int AS today,
        (SELECT count(DISTINCT ip_hash) FROM page_views WHERE viewed_at >= ${today})::int AS today_visitors,
        (SELECT count(*) FROM page_views)::int AS all_time,
        (SELECT avg(time_on_page) FROM page_views WHERE viewed_at >= ${from} AND page_type = 'post' AND time_on_page IS NOT NULL)::float AS avg_post`,
    sql<Day[]>`
      SELECT to_char(g.day, 'YYYY-MM-DD') AS day, count(p.id)::int AS views, count(DISTINCT p.ip_hash)::int AS visitors,
        avg(p.time_on_page)::float AS time
      FROM generate_series(date_trunc(${unit}, ${day0} - ${d - 1} * interval '1 day'), ${day0}, ${'1 ' + unit}::interval) AS g(day)
      LEFT JOIN page_views p ON p.viewed_at >= ${from} AND date_trunc(${unit}, p.viewed_at AT TIME ZONE ${TZ}) = g.day
      GROUP BY g.day ORDER BY g.day`,
    sql<{ slug: string; title: string | null; v: number; u: number }[]>`
      SELECT coalesce(r.to_slug, pv.post_slug) AS slug, max(p.title) AS title, count(*)::int AS v, count(DISTINCT pv.ip_hash)::int AS u
      FROM page_views pv
      LEFT JOIN redirects r ON r.from_slug = pv.post_slug -- views of a merged post count for the post it became part of
      LEFT JOIN posts p ON p.slug = coalesce(r.to_slug, pv.post_slug)
      WHERE pv.viewed_at >= ${from} AND pv.page_type = 'post' AND pv.post_slug IS NOT NULL
      GROUP BY 1 ORDER BY u DESC, v DESC LIMIT 10`,
    sql<{ page: string; slug: string | null; v: number; u: number }[]>`
      SELECT page_type AS page, CASE WHEN page_type = 'case' THEN post_slug END AS slug, count(*)::int AS v, count(DISTINCT ip_hash)::int AS u
      FROM page_views WHERE viewed_at >= ${from} AND page_type <> 'post' GROUP BY 1, 2 ORDER BY u DESC, v DESC LIMIT 10`,
    sql<{ ref: string | null; u: number }[]>`
      SELECT referrer AS ref, count(DISTINCT ip_hash)::int AS u FROM page_views WHERE viewed_at >= ${from} GROUP BY 1 ORDER BY u DESC LIMIT 10`,
    sql<{ c: string | null; u: number }[]>`
      SELECT country AS c, count(DISTINCT ip_hash)::int AS u FROM page_views WHERE viewed_at >= ${from} GROUP BY 1 ORDER BY u DESC LIMIT 10`,
  ]);

  const metrics = [
    { key: 'visitors' as const, label: 'Visitors', value: num(now.visitors), delta: delta(now.visitors, before.visitors) },
    { key: 'views' as const, label: 'Page views', value: num(now.views), delta: delta(now.views, before.views) },
    { key: 'time' as const, label: 'Avg. time', value: now.time ? dur(now.time) : '–', delta: delta(now.time, before.time) },
  ];

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Overview</h1>
          <p className="mute">dennypratama.com · your own visits are left out</p>
        </div>
        <nav className="adm-seg" aria-label="Period">
          {RANGES.map(([r, l]) => <Link key={r} href={`/admin?d=${r}`} aria-current={r === d ? 'page' : undefined}>{l}</Link>)}
        </nav>
      </header>

      {!imported && <ImportViews />}

      <Overview metrics={metrics} data={daily} weekly={unit === 'week'} />

      <section className="adm-strip" aria-label="More numbers">
        <Stat label="Visitors today" value={num(extra.today_visitors)} />
        <Stat label="Page views today" value={num(extra.today)} />
        <Stat label="Returning visitors" value={num(now.returning)} hint={now.visitors ? `${Math.round((now.returning / now.visitors) * 100)}% of visitors` : undefined} />
        <Stat label="Avg. time on a post" value={extra.avg_post ? dur(extra.avg_post) : '–'} />
        <Stat label="Page views, all time" value={num(extra.all_time)} />
      </section>

      <div className="adm-grid2">
        <Panel title="Blog posts" rows={posts.map((p) => ({
          key: p.slug, u: p.u, v: p.v,
          name: <><a href={`/blog/${p.slug}`} target="_blank" rel="noopener">{p.title ?? p.slug}</a>{!p.title && <span className="mute"> (removed)</span>}</>,
        }))} />
        <Panel title="Pages" rows={pages.map((p) => ({ key: p.page + p.slug, u: p.u, v: p.v, name: <span className="mono">{(PAGE_PATH[p.page] ?? p.page) + (p.slug ?? '')}</span> }))} />
        <Panel title="Referrers" rows={refs.map((r) => ({ key: r.ref ?? '-', u: r.u, name: r.ref ?? <span className="mute">Direct or unknown</span> }))} />
        <Panel title="Countries" rows={countries.map((c) => ({ key: c.c ?? '-', u: c.u, name: c.c ? regions.of(c.c) ?? c.c : <span className="mute">Unknown</span> }))} />
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="adm-stat"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</div>;
}

type PanelRow = { key: string; name: React.ReactNode; u: number; v?: number };

function Panel({ title, rows }: { title: string; rows: PanelRow[] }) {
  const top = Math.max(1, ...rows.map((r) => r.u));
  const views = rows.some((r) => r.v !== undefined);
  return (
    <section className="adm-card adm-panel">
      <div className="adm-panel-h"><h2>{title}</h2><span>Visitors{views && <i>Views</i>}</span></div>
      {rows.length === 0 ? <p className="adm-empty">No data for this period.</p> : (
        <ol>{rows.map((r) => (
          <li key={r.key}>
            <div className="bar"><i style={{ width: `${(r.u / top) * 100}%` }} /><span>{r.name}</span></div>
            <b>{num(r.u)}</b>{views && <em>{num(r.v ?? 0)}</em>}
          </li>
        ))}</ol>
      )}
    </section>
  );
}

