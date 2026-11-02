import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { fmtDate, getPost, getPosts, redirectFor } from '@/lib/posts';
import type { Post } from '@/lib/posts';
import { Crumb } from '@/components/PageParts';
import { Cover } from '@/components/Cover';
import { Mark } from '@/components/Mark';
import { ContactFooter } from '@/components/ContactFooter';
import { Arrow } from '@/components/Icons';
import { PostBody } from '@/components/pages/Mdx';
import { PostMeta } from '@/components/pages/PostCard';
import { ArticleFx } from '@/components/pages/ArticleFx';
import { Share } from '@/components/pages/Share';
import { SITE_URL } from '@/lib/site';

// a post published after the build renders on its first visit, then stays cached
export const revalidate = 300; // scheduled posts become visible on subsequent visits without waiting for daily cron
export const generateStaticParams = async () => (await getPosts()).map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.dek,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: 'article', publishedTime: p.date, title: p.title, description: p.dek, images: [p.image ?? '/opengraph-image'] },
    robots: p.sample ? { index: false } : undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    // an old slug that was renamed or merged, or a post that's held back for now
    const r = await redirectFor(slug);
    if (r) (r.permanent ? permanentRedirect : redirect)(r.to);
    notFound();
  }
  const posts = await getPosts();
  const idx = posts.findIndex((p) => p.slug === post.slug);
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <>
      <div className="rp" id="rp" aria-hidden="true" />
      <ArticleFx />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(post) }} />
      <main>
        <header className="ah wrap">
          <Crumb parts={[['Blog', '/blog'], [post.category]]} />
          <h1 className="ah-t t-d2">{post.title}</h1>
          <div className="ah-row grid"><p className="lead gc-1-7">{post.dek}</p></div>
          <div className="ah-meta" style={{ marginTop: 'var(--blk)' }}>
            <div className="by">
              <span className="av-m"><Mark /></span>
              <div><p>Denny Pratama</p><p className="mono mute">{fmtDate(post.date)} · {post.minutes} min read · {post.category}</p></div>
            </div>
            <Share title={post.title} />
          </div>
          <div className="ah-cv"><Cover n={idx + 1} kind={post.coverKind} label={post.category} /></div>
        </header>
        <article className="ar on-bone" id="art" aria-labelledby="ar-h">
          <h2 className="sr" id="ar-h">{post.title}</h2>
          <div className="wrap">
            <div className="ar-g grid">
              <aside className="gc-1-3">
                {post.toc.length > 0 && (
                  <nav className="toc" aria-label="On this page">
                    <p className="mono">On this page</p>
                    <ol>{post.toc.map((t) => <li key={t.id}><a href={`#${t.id}`} data-cursor="link"><span>{t.n}</span>{t.title}</a></li>)}</ol>
                  </nav>
                )}
              </aside>
              <div className="ar-b gc-4-9">
                <PostBody post={post} />
                <div className="ar-end">
                  <div className="tags">{post.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                  <Share title={post.title} />
                </div>
              </div>
              <aside className="gc-10-12">
                <div className="ar-side">
                  <p className="mono">Working on something?</p>
                  <p className="t-h4">I take on two or three projects a quarter.</p>
                  <Link className="btn btn-ink btn-s" href="/contact" data-cursor="link" style={{ alignSelf: 'flex-start' }}>Get in touch<Arrow /></Link>
                </div>
              </aside>
            </div>
            <div className="grid">
              <div className="au gc-4-10">
                <span className="av-m"><Mark /></span>
                <div><h3>Denny Pratama</h3><p>Product designer in Indonesia. Since 2018 I’ve designed SaaS products, dashboards and marketing sites, and now I build my own designs too.</p></div>
                <Link className="btn btn-s" href="/about" data-cursor="link">About me<Arrow /></Link>
              </div>
            </div>
          </div>
        </article>
        <section className="rel" aria-labelledby="rel-h">
          <div className="wrap">
            <div className="sec-head"><span className="mono">Next</span><span className="mono" id="rel-h">Keep reading</span><span className="push"><Link className="lnk mono" href="/blog" data-cursor="link">All posts<Arrow /></Link></span></div>
            <div className="rel-g">
              {related.map((p) => (
                <Link className="rel-a" href={`/blog/${p.slug}`} data-cursor="read" data-cl="Read" key={p.slug}>
                  <Cover n={posts.indexOf(p) + 1} kind={p.coverKind} label={p.category} bone={posts.indexOf(p) % 2 === 0} />
                  <PostMeta post={p} />
                  <h3>{p.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <ContactFooter />
    </>
  );
}

// BlogPosting, plus the FAQPage auto-post writes for each post, as the old site had
function jsonLd(p: Post) {
  const url = `${SITE_URL}/blog/${p.slug}`;
  const graph: object[] = [{
    '@type': 'BlogPosting', headline: p.title, description: p.dek, datePublished: p.date, url, mainEntityOfPage: url,
    ...(p.image && { image: p.image }),
    author: { '@type': 'Person', name: 'Denny Pratama', url: SITE_URL },
  }];
  if (p.faq?.length) graph.push({
    '@type': 'FAQPage',
    mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  // < is escaped so post text can never close the script tag
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

