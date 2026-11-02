import type { Post } from '@/lib/posts';
import { fmtDate } from '@/lib/posts';

export function PostMeta({ post }: { post: Pick<Post, 'category' | 'date' | 'minutes'> }) {
  return (
    <p className="pm mono"><b>{post.category}</b><span>{fmtDate(post.date)}</span><span>{post.minutes} min read</span></p>
  );
}

