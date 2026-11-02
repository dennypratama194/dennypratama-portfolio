'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let instance: Lenis | null = null;
export const lenis = () => instance;

/**
 * One scroll clock for the whole site: Lenis smooths the scroll, GSAP's ticker drives it,
 * and every ScrollTrigger and per-frame effect reads the same position.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const l = new Lenis({ lerp: 0.1, anchors: { offset: 0 }, autoRaf: false });
    instance = l;
    l.on('scroll', ScrollTrigger.update);
    const raf = (t: number) => l.raf(t * 1000);
    // first on the clock, so every effect this frame measures the page at the scroll position it will paint
    gsap.ticker.add(raf, false, true);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      l.destroy();
      instance = null;
    };
  }, []);

  // A new page starts at the top, unless the link points at an anchor.
  useEffect(() => {
    if (window.location.hash) return;
    instance ? instance.scrollTo(0, { immediate: true, force: true }) : window.scrollTo(0, 0);
  }, [path]);

  return null;
}

