import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { fromRow, type Row } from '@/lib/posts';
import { PostBody } from '@/components/pages/Mdx';

/** The post as it will read on the site, drafts included. The article only: no nav, cover or related posts. */
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [r] = await db()<(Row & { status: string })[]>`SELECT slug, title, excerpt, body, category, faq, status,
    coalesce(published_at, updated_at) AS published_at FROM posts WHERE id = ${Number(id)}`;
  if (!r) notFound();
  const post = fromRow(r);
  return (
    <div className="site adm-pv">
      <div className="adm-pv-bar">
        <span>Preview · {r.status} · {post.category} · {post.minutes} min read</span>
        <Link href={`/admin/posts/${id}`}>Back to the editor</Link>
      </div>
      <header className="wrap" style={{ paddingBlock: 64 }}>
        <h1 className="t-d2" style={{ marginTop: 16 }}>{post.title}</h1>
        <p className="lead" style={{ marginTop: 24, maxWidth: 720 }}>{post.dek}</p>
      </header>
      <article className="ar on-bone">
        <div className="wrap">
          <div className="ar-g grid">
            <aside className="gc-1-3">
              {post.toc.length > 0 && (
                <nav className="toc" aria-label="On this page">
                  <p className="mono">On this page</p>
                  <ol>{post.toc.map((t) => <li key={t.id}><a href={`#${t.id}`}><span>{t.n}</span>{t.title}</a></li>)}</ol>
                </nav>
              )}
            </aside>
            <div className="ar-b gc-4-9"><PostBody post={post} /></div>
          </div>
        </div>
      </article>
    </div>
  );
}

