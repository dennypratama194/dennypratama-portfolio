'use client';

import { useEffect } from 'react';
import { onFrame, setVar, viewH } from '@/lib/frame';

/** Reading progress bar and the active item in the table of contents. */
export function ArticleFx() {
  useEffect(() => {
    const art = document.getElementById('art');
    const bar = document.getElementById('rp');
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
    const heads = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean) as HTMLElement[];
    if (!art || !bar) return;
    let cur = -1;
    let r: DOMRect | null = null;
    let i = 0;
    const read = () => {
      r = art.getBoundingClientRect();
      i = -1;
      heads.forEach((h, k) => { if (h.getBoundingClientRect().top < viewH() * 0.35) i = k; });
      i = Math.max(0, i);
    };
    const write = () => {
      if (!r) return;
      const span = Math.max(1, r.height - viewH() * 0.6);
      setVar(bar, '--rp', Math.min(1, Math.max(0, -r.top / span)).toFixed(4));
      if (i !== cur) {
        cur = i;
        links.forEach((a, k) => a.classList.toggle('on', k === i));
      }
    };
    return onFrame(read, write);
  }, []);
  return null;
}

