import Image from 'next/image';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { highlight } from '../Code';
import type { Post } from '@/lib/posts';

type P = { children?: React.ReactNode };

const text = (n: React.ReactNode): string =>
  typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' && 'props' in n ? text((n as React.ReactElement<P>).props.children) : '';

function components(post: Post) {
  return {
    // headings get their number from the table of contents built from the source
    h2: ({ children }: P) => {
      const t = post.toc.find((x) => x.title === text(children));
      return <h2 id={t?.id}>{t && <span>{t.n}</span>}{children}</h2>;
    },
    blockquote: ({ children }: P) => <blockquote className="pull">{children}</blockquote>,
    table: ({ children }: P) => <table className="tbl">{children}</table>,
    pre: ({ children }: P) => {
      const code = text(children).replace(/\n$/, '');
      return <pre className="code" dangerouslySetInnerHTML={{ __html: highlight(code) }} />;
    },
    a: ({ href = '', children }: P & { href?: string }) =>
      href.startsWith('/') ? <Link href={href}>{children}</Link> : <a href={href} target="_blank" rel="noopener">{children}</a>,
    Note: ({ title, children }: P & { title: string }) => (
      <div className="note"><i /><p><b>{title}</b>{children}</p></div>
    ),
    Key: ({ children, label = 'Short version' }: P & { label?: string }) => (
      <div className="key"><span className="mono">{label}</span>{children}</div>
    ),
    Fig: ({ src, alt = '', caption, children }: P & { src?: string; alt?: string; caption?: string }) => (
      <figure className="ar-fig">
        {src ? <span className="shot"><Image src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, 50vw" /></span> : children}
        <figcaption>{caption ?? (src ? children : null)}</figcaption>
      </figure>
    ),
  };
}

export function PostBody({ post }: { post: Post }) {
  // posts from the database are plain Markdown: no JSX or raw HTML, so a post can't run code or break the page
  const format = post.format === 'md' ? 'md' : 'mdx';
  return <MDXRemote source={post.body} components={components(post)} options={{ mdxOptions: { format, remarkPlugins: [remarkGfm] } }} />;
}

