import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import matter from 'gray-matter';
import { db, hasDb } from './db';

export type Post = {
  slug: string; title: string; category: string; date: string; minutes: number; dek: string;
  coverKind: number; sample: boolean; tags: string[];
  /** Markdown from the database, or MDX for the local sample posts */
  body: string; format: 'md' | 'mdx';
  toc: { n: string; id: string; title: string }[];
  image?: string; faq?: { q: string; a: string }[];
};
export type PostSummary = Omit<Post, 'body' | 'format' | 'toc' | 'faq'>;

/**
 * Posts live in Postgres (DATABASE_URL), written in the admin or by auto-post. Public pages use five-minute ISR
 * plus on-demand invalidation, so scheduled posts also appear when the daily cron has not run yet.
 * Without DATABASE_URL the local sample MDX is used, so the site still runs offline. A production build without
 * it fails instead of shipping samples.
 */
export { CATEGORIES } from './categories';

const DIR = path.join(process.cwd(), 'content/blog');

export const slugify = (s: string) => s.toLowerCase().replace(/’|'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fmtDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

// h2 headings become the numbered table of contents; inline Markdown is dropped so titles match the rendered text
const plain = (s: string) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
export const tocOf = (md: string) => [...md.replace(/^```[\s\S]*?^```/gm, '').matchAll(/^## (.+)$/gm)].map((m, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { n, id: `s${n}`, title: plain(m[1]) };
});
const minutesOf = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));

// a stable cover per post, so a post keeps its artwork between deploys
const coverKind = (slug: string) => [...slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 7;

function readLocal(file: string): Post {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
  return {
    slug: file.replace(/\.mdx$/, ''), title: data.title, category: data.category, date, minutes: data.minutes,
    dek: data.dek, coverKind: data.coverKind ?? 0, sample: !!data.sample, tags: data.tags ?? [data.category], body: content, format: 'mdx', toc: tocOf(content),
  };
}

function loadLocal() {
  // The public source demo intentionally uses local sample posts without a database.
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.mdx')).map(readLocal);
}

export type Row = { slug: string; title: string; excerpt: string; body: string; category: string; faq: { q: string; a: string }[]; published_at: Date };

export const fromRow = (r: Row): Post => ({
  slug: r.slug, title: r.title, category: r.category, date: r.published_at.toISOString().slice(0, 10),
  minutes: minutesOf(r.body), dek: r.excerpt, coverKind: coverKind(r.slug), sample: false, tags: [r.category],
  body: r.body, format: 'md', toc: tocOf(r.body), faq: r.faq?.length ? r.faq : undefined,
});

let local: Post[] | null = null;
const localPosts = () => [...(local ??= loadLocal())].sort((a, b) => (a.date < b.date ? 1 : -1));
const summarize = (p: Post): PostSummary => ({
  slug: p.slug, title: p.title, category: p.category, date: p.date, minutes: p.minutes, dek: p.dek,
  coverKind: p.coverKind, sample: p.sample, tags: p.tags, image: p.image,
});

// Listings and sitemaps never transfer every article body to the application.
export const getPosts = cache(async (): Promise<PostSummary[]> => {
  if (!hasDb) return localPosts().map(summarize);
  const rows = await db()<(Omit<Row, 'body' | 'faq'> & { minutes: number })[]>`
    SELECT slug, title, excerpt, category, published_at,
      greatest(1, round(cardinality(regexp_split_to_array(btrim(body), '[[:space:]]+')) / 200.0))::int AS minutes
    FROM posts
    WHERE status = 'published' AND published_at <= now()
    ORDER BY published_at DESC`;
  return rows.map((r) => ({
    slug: r.slug, title: r.title, category: r.category, date: r.published_at.toISOString().slice(0, 10),
    minutes: r.minutes, dek: r.excerpt, coverKind: coverKind(r.slug), sample: false, tags: [r.category],
  }));
});

// The unique slug index serves one article, including a cheap miss, rather than loading the entire archive.
export const getPost = cache(async (slug: string): Promise<Post | undefined> => {
  if (slug.length > 200 || !/^[A-Za-z0-9_-]+$/.test(slug)) return undefined;
  if (!hasDb) return localPosts().find((p) => p.slug === slug);
  const [row] = await db()<Row[]>`SELECT slug, title, excerpt, body, category, faq, published_at FROM posts
    WHERE slug = ${slug} AND status = 'published' AND published_at <= now() LIMIT 1`;
  return row ? fromRow(row) : undefined;
});

/**
 * Where a missing slug should send visitors: the post it was renamed or merged into, or the blog list while the
 * post is held back as a draft or waiting for its publish date (a temporary redirect, since it may come back).
 */
export async function redirectFor(slug: string): Promise<{ to: string; permanent: boolean } | null> {
  if (!hasDb) return null;
  const [r] = await db()<{ to_slug: string }[]>`SELECT to_slug FROM redirects WHERE from_slug = ${slug}`;
  if (r) return { to: `/blog/${r.to_slug}`, permanent: true };
  const [held] = await db()`SELECT 1 FROM posts WHERE slug = ${slug}`;
  return held ? { to: '/blog', permanent: false } : null;
}

export const categories = (posts: PostSummary[]) => {
  const names = [...new Set(posts.map((p) => p.category))];
  return [{ key: 'all', label: 'All', count: posts.length }, ...names.map((n) => ({ key: slugify(n), label: n, count: posts.filter((p) => p.category === n).length }))];
};

