import type { Metadata } from 'next';
import Link from 'next/link';
import { categories, fmtDate, getPosts, slugify } from '@/lib/posts';
import { PageHead } from '@/components/PageParts';
import { Chips, FilterScope, Filtered } from '@/components/pages/Filter';
import { BlogList } from '@/components/pages/BlogList';
import { PostMeta } from '@/components/pages/PostCard';
import { Newsletter } from '@/components/pages/Newsletter';
import { Cover } from '@/components/Cover';
import { ContactFooter } from '@/components/ContactFooter';
import { Arrow } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Notes on product design, and on building my own designs with AI tools.',
  alternates: { canonical: '/blog' },
};

export const revalidate = 300; // scheduled posts do not wait for the next daily cron

export default async function BlogPage() {
  const posts = await getPosts();
  const [first, ...rest] = posts;
  const cats = categories(posts);
  return (
    <FilterScope>
      <main>
        <PageHead
          title="Blog"
          sup={String(posts.length).padStart(2, '0')}
          lead="Notes on product design, and on building my own designs with AI tools."
          right={<Chips label="Filter posts" items={cats} />}
        />
        {first ? <Filtered k={slugify(first.category)}>
          <section className="bf on-bone" aria-labelledby="bf-h">
            <div className="wrap">
              <Link className="bf-a" href={`/blog/${first.slug}`} data-cursor="read" data-cl="Read">
                <span className="bf-c"><Cover n={1} kind={first.coverKind} label={first.category} /></span>
                <span className="bf-t">
                  <PostMeta post={first} />
                  <span className="t-h1" id="bf-h">{first.title}</span>
                  <span className="lead">{first.dek}</span>
                  <span className="lnk mono" style={{ alignSelf: 'flex-start' }}>Read the post<Arrow /></span>
                </span>
              </Link>
            </div>
          </section>
        </Filtered> : <p className="wrap lead">New notes are on the way.</p>}
        <BlogList rows={rest.map((p, i) => ({ slug: p.slug, title: p.title, category: p.category, cat: slugify(p.category), date: fmtDate(p.date), minutes: p.minutes, coverKind: p.coverKind, n: i + 2 }))} />
        <Newsletter />
      </main>
      <ContactFooter />
    </FilterScope>
  );
}

