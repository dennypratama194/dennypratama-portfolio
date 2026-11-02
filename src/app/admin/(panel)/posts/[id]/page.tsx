import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Editor, type EditorPost } from './Editor';
import { requireAdmin } from '@/lib/auth';

// datetime-local wants "YYYY-MM-DDTHH:mm" in Jakarta time
const local = (d: Date | null) => d ? new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 16) : '';

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const saved = !!(await searchParams).saved;
  if (id === 'new') return <Editor post={{ id: null, title: '', slug: '', category: 'UI/UX', excerpt: '', body: '', faq: '', status: 'draft', published_at: '' }} />;
  if (!/^\d+$/.test(id)) notFound();
  const [p] = await db()<{ id: number; title: string; slug: string; category: string; excerpt: string; body: string; faq: { q: string; a: string }[]; status: string; published_at: Date | null }[]>`
    SELECT id, title, slug, category, excerpt, body, faq, status, published_at FROM posts WHERE id = ${Number(id)}`;
  if (!p) notFound();
  const post: EditorPost = {
    ...p, status: p.status === 'published' ? 'published' : 'draft', published_at: local(p.published_at),
    faq: p.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n'),
  };
  return <Editor post={post} justSaved={saved} />;
}

