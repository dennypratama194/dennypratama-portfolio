import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type Row = { id: number; title: string; slug: string; category: string; status: string; published_at: Date | null; source: string; updated_at: Date };
const date = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

export default async function Posts({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const show = (await searchParams).show;
  const rows = await db()<Row[]>`SELECT id, title, slug, category, status, published_at, source, updated_at FROM posts
    ORDER BY (status = 'draft') DESC, coalesce(published_at, updated_at) DESC`;
  const now = Date.now();
  const state = (r: Row) => r.status === 'draft' ? 'draft' : r.published_at && r.published_at.getTime() > now ? 'scheduled' : 'live';
  const list = show ? rows.filter((r) => state(r) === show) : rows;
  const count = (s: string) => rows.filter((r) => state(r) === s).length;
  return (
    <>
      <header className="adm-head">
        <h1>Posts</h1>
        <Link className="adm-btn" href="/admin/posts/new">New post</Link>
      </header>
      <nav className="adm-tabs" aria-label="Filter">
        <Link href="/admin/posts" aria-current={!show ? 'page' : undefined}>All {rows.length}</Link>
        {['live', 'scheduled', 'draft'].map((s) => <Link key={s} href={`/admin/posts?show=${s}`} aria-current={show === s ? 'page' : undefined}>{s[0].toUpperCase() + s.slice(1)} {count(s)}</Link>)}
      </nav>
      <section className="adm-card">
        {list.length === 0 ? <p className="mute">No posts here yet.</p> : (
          <table className="adm-tbl">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{list.map((r) => {
              const s = state(r);
              return (
                <tr key={r.id}>
                  <td><Link href={`/admin/posts/${r.id}`}>{r.title}</Link>{r.source === 'auto' && <span className="mute"> · auto-post</span>}</td>
                  <td>{r.category}</td>
                  <td><span className={`adm-pill ${s === 'live' ? 'live' : s === 'scheduled' ? 'soon' : ''}`}>{s}</span></td>
                  <td className="mute">{date(r.published_at ?? r.updated_at)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </section>
    </>
  );
}

