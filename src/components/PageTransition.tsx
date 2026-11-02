'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { Mark } from './Mark';
import { NAV } from '@/lib/site';
import { SLASH } from '@/lib/slash';

const labelFor = (path: string) => {
  if (path === '/') return 'Home';
  const top = NAV.find((n) => path === n.href || path.startsWith(`${n.href}/`));
  return top ? top.label : '';
};

/**
 * Route changes wipe across on the site's 23.6° slash: a bone panel cuts in from the right, holds while
 * the next page renders, then carries on out to the left. Internal links are caught in the capture phase,
 * so next/link and plain anchors both go through it.
 */
export function PageTransition() {
  const router = useRouter();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const state = useRef<{ covering: boolean; tl?: gsap.core.Timeline; safety?: number; uncover?: () => void }>({ covering: false });

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    gsap.set(el, { skewX: -SLASH, xPercent: 100 });

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;

      e.preventDefault();
      e.stopPropagation();
      const s = state.current;
      if (s.covering) return;
      s.covering = true;
      if (label.current) label.current.textContent = labelFor(url.pathname);

      s.tl?.kill();
      s.tl = gsap.timeline()
        .set(el, { visibility: 'visible', xPercent: 100 })
        .set(mark.current, { rotate: 0 })
        .to(el, { xPercent: 0, duration: 0.6, ease: 'expo.inOut' })
        .to(mark.current, { rotate: 180, duration: 0.9, ease: 'expo.inOut' }, 0)
        .add(() => router.push(url.pathname + url.search + url.hash));
      // If the route never resolves, never leave the page covered.
      s.safety = window.setTimeout(() => uncover(), 5000);
    };

    const uncover = () => {
      const s = state.current;
      if (!s.covering) return;
      s.covering = false;
      clearTimeout(s.safety);
      s.tl?.kill();
      s.tl = gsap.timeline()
        .to(el, { xPercent: -100, duration: 0.7, ease: 'expo.inOut' })
        .set(el, { visibility: 'hidden', xPercent: 100 });
    };
    state.current.uncover = uncover;

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [router]);

  // The new route has rendered: let the next frame paint, then reveal it.
  useEffect(() => {
    const s = state.current;
    if (!s.covering) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => s.uncover?.()));
    return () => cancelAnimationFrame(id);
  }, [path]);

  return (
    <div className="ptx" aria-hidden="true">
      <div className="ptx-p" ref={panel}>
        <div className="ptx-c">
          <div className="ptx-m" ref={mark}><Mark /></div>
          <span className="mono" ref={label} />
        </div>
      </div>
    </div>
  );
}

