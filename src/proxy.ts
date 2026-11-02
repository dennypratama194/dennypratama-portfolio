import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { adminCsp } from './lib/csp';

/** Headers only. Authorization remains in every protected page/action, never solely in Proxy. */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(24).toString('base64');
  const policy = adminCsp(nonce);
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };

