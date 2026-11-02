'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authConfigured, envLines, logIn, logOut, requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { CATEGORIES, slugify } from '@/lib/posts';
import { refreshBlog } from '@/lib/revalidate';
import { parseFaq, runAutoPost, saveSettings } from '@/lib/autopost';
import { rowsOf } from '@/lib/mysqlDump';

export async function loginAction(_: string | null, form: FormData) {
  const err = await logIn(String(form.get('password') ?? ''));
  if (err) return err;
  redirect('/admin');
}

export async function logoutAction() {
  await logOut();
  redirect('/admin/login');
}

export type SaveState = { error?: string; saved?: boolean } | null;

export async function savePost(_: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const sql = db();
  const id = Number(form.get('id')) || null;
  const title = String(form.get('title') ?? '').trim();
  const slug = slugify(String(form.get('slug') ?? '') || title).slice(0, 80);
  const category = String(form.get('category') ?? '');
  const excerpt = String(form.get('excerpt') ?? '').trim();
  const body = String(form.get('body') ?? '').replace(/\r\n/g, '\n');
  const faq = parseFaq(String(form.get('faq') ?? '').replace(/\r\n/g, '\n'));
  const status = form.get('status') === 'published' ? 'published' : 'draft';
  const when = String(form.get('published_at') ?? '');
  // the form sends Jakarta time without a zone
  const publishedAt = when ? new Date(`${when}:00+07:00`) : status === 'published' ? new Date() : null;

  if (!title || !slug) return { error: 'A post needs a title.' };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: 'Pick a category.' };
  if (publishedAt && Number.isNaN(publishedAt.getTime())) return { error: 'That publish date isn’t valid.' };

  const [clash] = await sql`SELECT 1 FROM posts WHERE slug = ${slug} AND id IS DISTINCT FROM ${id}
    UNION ALL SELECT 1 FROM redirects WHERE from_slug = ${slug} AND to_slug <> ${slug}`;
  if (clash) return { error: `The address /blog/${slug} is already used by another post or redirect.` };

  let postId = id;
  await sql.begin(async (tx) => {
    if (id) {
      const [old] = await tx<{ slug: string; status: string }[]>`SELECT slug, status FROM posts WHERE id = ${id}`;
      // a live post that changes address keeps its old one as a 301
      if (old && old.slug !== slug && old.status === 'published') {
        await tx`INSERT INTO redirects (from_slug, to_slug) VALUES (${old.slug}, ${slug})
          ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug`;
        await tx`UPDATE redirects SET to_slug = ${slug} WHERE to_slug = ${old.slug}`;
      }
      await tx`UPDATE posts SET title = ${title}, slug = ${slug}, category = ${category}, excerpt = ${excerpt}, body = ${body},
        faq = ${tx.json(faq)}, status = ${status}, published_at = ${publishedAt}, updated_at = now() WHERE id = ${id}`;
    } else {
      const [row] = await tx<{ id: number }[]>`INSERT INTO posts (title, slug, category, excerpt, body, faq, status, published_at)
        VALUES (${title}, ${slug}, ${category}, ${excerpt}, ${body}, ${tx.json(faq)}, ${status}, ${publishedAt}) RETURNING id`;
      postId = row.id;
    }
    await tx`DELETE FROM redirects WHERE from_slug = ${slug}`; // the address is a real post again
  });
  refreshBlog();
  revalidatePath('/admin', 'layout');
  if (!id) redirect(`/admin/posts/${postId}?saved=1`);
  return { saved: true };
}

export async function deletePost(form: FormData) {
  await requireAdmin();
  const id = Number(form.get('id'));
  await db()`DELETE FROM posts WHERE id = ${id}`;
  refreshBlog();
  redirect('/admin/posts');
}

export async function saveAutoSettings(form: FormData) {
  await requireAdmin();
  const days = form.getAll('days').map(Number).filter((d) => d >= 0 && d <= 6);
  await saveSettings({ enabled: form.get('enabled') === 'on', days, publish: form.get('publish') === 'on' });
  revalidatePath('/admin/auto-post');
}

export async function runNow() {
  await requireAdmin();
  const r = await runAutoPost();
  revalidatePath('/admin', 'layout');
  if (r.ok && r.postId) redirect(`/admin/posts/${r.postId}`);
}

export type ImportState = { error?: string; done?: string } | null;

/** Loads the old site's page view history from its phpMyAdmin export, once. */
export async function importViews(_: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose the .sql file first.' };
  const sql = db();
  const [done] = await sql`SELECT 1 FROM settings WHERE key = 'views_imported'`;
  if (done) return { error: 'The old page views are already loaded.' };
  let rows;
  try { rows = rowsOf(await file.text(), 'page_views'); } catch (e) { return { error: e instanceof Error ? e.message : 'That file couldn’t be read.' }; }
  if (!rows.length) return { error: 'No page views found in that file. Export the page_views table from phpMyAdmin as SQL.' };
  // the old server's clock ran on Jakarta time; the old tracker stored our own page as the referrer, so only outside hosts are kept
  const at = (s: unknown) => (typeof s === 'string' && !s.startsWith('0000') ? new Date(s.replace(' ', 'T') + '+07:00') : null);
  const host = (u: unknown) => { try { const h = new URL(String(u)).hostname.replace(/^www\./, ''); return h.endsWith('dennypratama.com') ? null : h; } catch { return null; } };
  const views = rows.map((v) => ({
    page_type: String(v.page_type), post_slug: v.post_slug == null ? null : String(v.post_slug), ip_hash: String(v.ip_hash ?? ''),
    country: v.country == null ? null : String(v.country), referrer: v.referrer ? host(v.referrer) : null,
    viewed_at: at(v.viewed_at), time_on_page: typeof v.time_on_page === 'number' ? v.time_on_page : null,
  })).filter((v) => v.viewed_at && v.ip_hash.length === 64);
  await sql.begin(async (tx) => {
    for (let i = 0; i < views.length; i += 1000) await tx`INSERT INTO page_views ${tx(views.slice(i, i + 1000))}`;
    await tx`INSERT INTO settings (key, value) VALUES ('views_imported', ${tx.json(new Date().toISOString())})`;
  });
  // no revalidate here: it would re-render the dashboard without this form and hide the message
  return { done: `${views.length.toLocaleString('en-US')} page views loaded. Refresh the page to see them in the numbers.` };
}

export type SetupState = { error?: string; lines?: string } | null;

/** Turns a new password into the three env values for Vercel. Sets nothing; refuses once login is configured. */
export async function setupAction(_: SetupState, form: FormData): Promise<SetupState> {
  if (authConfigured()) return { error: 'Login is already set up.' };
  const pw = String(form.get('password') ?? '');
  if (pw.length < 12) return { error: 'Use 12 or more characters.' };
  if (pw !== String(form.get('again') ?? '')) return { error: 'The two passwords don’t match.' };
  return { lines: await envLines(pw) };
}

