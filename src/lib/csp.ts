import { createHash } from 'node:crypto';
import { INTRO_SEEN_SCRIPT } from './intro';
import { JSON_LD } from './structuredData';

const hash = (value: string) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;

/** Admin is rendered per request. Public pages retain static caching and their existing CSP. */
export function adminCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== 'production';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${hash(INTRO_SEEN_SCRIPT)} ${hash(JSON_LD)}${dev ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self' data:", "media-src 'self' blob:",
    "connect-src 'self'", "worker-src 'self' blob:", "frame-src 'none'", "object-src 'none'",
    "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

