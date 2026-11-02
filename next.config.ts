import type { NextConfig } from 'next';

/**
 * Security headers for every response. Scripts allow 'unsafe-inline' because Next writes its page data as
 * inline scripts and the pages are static: a nonce would make every page render per request. Everything else is
 * this site only. Nothing loads from other hosts (fonts are self-hosted, mail goes out from the server), and
 * dev mode alone needs eval for fast refresh.
 */
const dev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // the hero's tilt reads the gyroscope on phones, so motion sensors stay allowed for this site
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), accelerometer=(self), gyroscope=(self)' },
];

const nextConfig: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  // the admin's page view import takes the old site's whole SQL export (about 600 KB today)
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      // pages from the old site that this one drops
      { source: '/case-studies/:slug*', destination: '/work', permanent: true },
      { source: '/showcase/:slug*', destination: '/work', permanent: true },
      // the old site's legacy and .php URLs, which it 301'd to these
      { source: '/post', has: [{ type: 'query', key: 'slug', value: '(?<slug>[A-Za-z0-9_-]+)' }], destination: '/blog/:slug', permanent: true },
      { source: '/post.php', has: [{ type: 'query', key: 'slug', value: '(?<slug>[A-Za-z0-9_-]+)' }], destination: '/blog/:slug', permanent: true },
      { source: '/index.:ext(php|html)', destination: '/', permanent: true },
      { source: '/blog.php', destination: '/blog', permanent: true },
      { source: '/:page(case-studies|case-study|showcase|showcase-item).php', destination: '/work', permanent: true },
      // the old admin's PHP pages go to the new admin
      { source: '/admin/:file(.+\\.php)', destination: '/admin', permanent: true },
      // the old ebook store and legal pages aren't rebuilt here (no ebook was ever sold); old links go home
      { source: '/:page(ebooks|privacy-policy|terms-and-conditions|my-library)', destination: '/', permanent: true },
      { source: '/:page(ebook|read)/:slug', destination: '/', permanent: true },
      { source: '/:page(ebooks|ebook|privacy-policy|terms-and-conditions|my-library|read|recover).php', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;

