import type { Metadata } from 'next';
import { TOKENS_HTML } from './tokensHtml';

export const metadata: Metadata = { title: 'Design tokens', robots: { index: false } };

/** The design system reference page. Not linked from the site. */
export default function TokensPage() {
  return <main dangerouslySetInnerHTML={{ __html: TOKENS_HTML }} />;
}

