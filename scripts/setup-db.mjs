// Runs before every build (npm run build). With DATABASE_URL set it creates or updates the tables (db/schema.sql),
// and on the very first run loads the blog posts in db/seed/posts. Without DATABASE_URL it does nothing, so local
// work without a database still builds with the sample posts.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.log('setup-db: no DATABASE_URL, skipping.');
  process.exit(0);
}
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
// Neon's URL carries channel_binding, which postgres.js would send to the server as a setting it doesn't know
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('channel_binding');
const sql = postgres(url.toString(), { max: 1, prepare: false, onnotice: () => {} });

await sql.unsafe(fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8'));

// the seed runs once: after that the admin owns the posts, and a deleted post must stay deleted
const [seeded] = await sql`SELECT 1 FROM settings WHERE key = 'seeded'`;
if (!seeded) {
  const dir = path.join(root, 'db/seed/posts');
  const posts = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!data.slug || !data.title || !['UI/UX', 'Development', 'AI'].includes(data.category)) throw new Error(`${f}: missing slug or title, or an unknown category`);
    return { ...data, body: content.trim(), merged: data.merged_from ?? [], status: data.status === 'draft' ? 'draft' : 'published' };
  });
  await sql.begin(async (tx) => {
    for (const p of posts) {
      await tx`INSERT INTO posts (slug, title, excerpt, body, category, faq, status, published_at, source)
        VALUES (${p.slug}, ${p.title}, ${p.excerpt ?? ''}, ${p.body}, ${p.category}, ${tx.json(p.faq ?? [])},
          ${p.status}, ${new Date(p.published_at)}, 'import')
        ON CONFLICT (slug) DO NOTHING`;
      // merged posts keep answering, with a 301 to the post they became part of
      for (const from of p.merged) {
        await tx`INSERT INTO redirects (from_slug, to_slug) VALUES (${from}, ${p.slug}) ON CONFLICT (from_slug) DO NOTHING`;
      }
    }
    await tx`INSERT INTO settings (key, value) VALUES ('seeded', ${tx.json(new Date().toISOString())})`;
  });
  console.log(`setup-db: tables ready, ${posts.length} posts loaded.`);
} else console.log('setup-db: tables ready.');
await sql.end();

