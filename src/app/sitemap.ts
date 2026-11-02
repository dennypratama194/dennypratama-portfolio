import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { CASES } from '@/lib/cases';
import { getPosts } from '@/lib/posts';

export const revalidate = 300; // include newly due posts without waiting for daily cron

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/work', '/about', '/blog', '/contact'].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.8 }));
  const cases = ['dennypratama', ...CASES.map((c) => c.slug)].map((slug) => ({ url: `${SITE_URL}/work/${slug}`, priority: 0.7 }));
  // sample posts stay out of the index until Denny replaces them
  const posts = (await getPosts()).filter((p) => !p.sample).map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date, priority: 0.6 }));
  return [...pages, ...cases, ...posts];
}

