'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { deletePost, savePost } from '../../../actions';

export type EditorPost = {
  id: number | null; title: string; slug: string; category: string; excerpt: string; body: string; faq: string;
  status: 'draft' | 'published'; published_at: string;
};

export function Editor({ post, justSaved = false }: { post: EditorPost; justSaved?: boolean }) {
  const [state, action, pending] = useActionState(savePost, justSaved ? { saved: true } : null);
  const [status, setStatus] = useState(post.status);
  return (
    <>
      <header className="adm-head">
        <h1>{post.id ? 'Edit post' : 'New post'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {post.id && <Link className="adm-btn ghost" href={`/admin/preview/${post.id}`} target="_blank">Preview ↗</Link>}
          {post.id && post.status === 'published' && <a className="adm-btn ghost" href={`/blog/${post.slug}`} target="_blank" rel="noopener">View live ↗</a>}
        </div>
      </header>
      <form action={action} className="adm-form">
        <input type="hidden" name="id" value={post.id ?? ''} />
        {state?.error && <p className="adm-msg err" role="alert">{state.error}</p>}
        {state?.saved && !pending && <p className="adm-msg ok" role="status">Saved. Preview shows the last saved version.</p>}
        <label>Title<input type="text" name="title" defaultValue={post.title} required /></label>
        <div className="row">
          <label>Address (/blog/…)<input type="text" name="slug" defaultValue={post.slug} placeholder="made from the title if empty" /></label>
          <label>Category
            <select name="category" defaultValue={post.category}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>
        <label>Excerpt (shown on the blog list and in search results, under 160 characters)<textarea name="excerpt" rows={2} defaultValue={post.excerpt} maxLength={300} /></label>
        <label>Body (Markdown: ## for sections, ### for sub-sections, **bold**, [link](url), ``` for code)
          <textarea className="md" name="body" defaultValue={post.body} spellCheck />
        </label>
        <label>FAQ (for search engines; one “Q: …” line, then “A: …”, per question)<textarea name="faq" rows={6} defaultValue={post.faq} /></label>
        <div className="row">
          <label>Status
            <select name="status" value={status} onChange={(e) => setStatus(e.target.value as EditorPost['status'])}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label>Publish date, Jakarta time (a future date schedules it)<input type="datetime-local" name="published_at" defaultValue={post.published_at} disabled={status === 'draft'} /></label>
        </div>
        <div className="adm-actions">
          <button className="adm-btn" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
      {post.id && (
        <form className="adm-actions adm-del" action={deletePost} onSubmit={(e) => { if (!confirm('Delete this post for good? Its address will stop working.')) e.preventDefault(); }}>
          <input type="hidden" name="id" value={post.id} />
          <button className="adm-btn danger">Delete post</button>
        </form>
      )}
    </>
  );
}

