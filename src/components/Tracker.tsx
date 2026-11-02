'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Feeds page views and time on page into the admin dashboard (api/track). */
const URL_ = '/api/track';

function pageOf(path: string): { page: string; slug?: string } | null {
  if (path === '/') return { page: 'home' };
  if (path === '/blog') return { page: 'blog' };
  const post = path.match(/^\/blog\/([^/]+)$/);
  if (post) return { page: 'post', slug: decodeURIComponent(post[1]) };
  if (path === '/work') return { page: 'work' };
  const work = path.match(/^\/work\/([^/]+)$/);
  if (work) return { page: 'case', slug: decodeURIComponent(work[1]) };
  if (path === '/about') return { page: 'about' };
  if (path === '/contact') return { page: 'contact' };
  return null;
}

// the external page a visitor arrived from, sent with the first view only
let firstView = true;

export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const view = pageOf(path);
    if (!view) return;
    const start = Date.now();
    let event: { id: number; token: string } | null = null;
    let sent = false;
    const ref = firstView ? document.referrer : '';
    firstView = false;
    fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...view, ref }) })
      .then((r) => r.json())
      .then((d) => { if (Number.isSafeInteger(d?.id) && typeof d?.token === 'string') event = { id: d.id, token: d.token }; })
      .catch(() => {});
    const end = () => {
      const duration = Math.round((Date.now() - start) / 1000);
      if (sent || !event || duration < 1) return;
      sent = true;
      const body = JSON.stringify({ end: true, ...event, duration });
      const queued = navigator.sendBeacon(URL_, new Blob([body], { type: 'application/json' }));
      if (!queued) void fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
    };
    const onHide = () => { if (document.visibilityState === 'hidden') end(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', end);
    return () => {
      end(); // client-side navigation closes this view
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', end);
    };
  }, [path]);
  return null;
}

