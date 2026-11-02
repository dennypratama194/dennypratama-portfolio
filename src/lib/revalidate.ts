import { revalidatePath } from 'next/cache';

/** Blog pages are static until a post changes. Call this after any write that a visitor could see. */
export function refreshBlog() {
  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  revalidatePath('/sitemap.xml');
}

