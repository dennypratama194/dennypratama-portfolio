'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { deferWrite } from '@/lib/frame';

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const span = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

type Range = { cover: number; entry: (pct: number) => number };

/**
 * Tracks an element across the CSS "cover" range (top edge at the viewport bottom to bottom edge at the top),
 * and hands the callback both cover progress and a converter for "entry" percentages. This mirrors the
 * view() timelines in the design, so every effect stays scrubbed to scroll exactly as drawn.
 */
function track(el: HTMLElement, apply: (r: Range) => void) {
  // sizes only change on a refresh, so measure there, never mid-scroll
  let h = el.offsetHeight;
  let vh = window.innerHeight;
  let p = 0;
  let queued = false;
  let alive = true;
  // entry X% sits at X*h of the vh+h cover distance
  const run = () => { queued = false; if (alive) apply({ cover: p, entry: (x) => (x * h) / (vh + h) }); };
  const queue = () => { if (!queued) { queued = true; deferWrite(run); } };
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    // scroll updates write in the frame's writing half, after every effect has measured (see lib/frame)
    onUpdate: (s) => { p = s.progress; queue(); },
    // Refreshing a list must also measure all rows before any row writes its styles.
    onRefresh: (s) => { h = el.offsetHeight; vh = window.innerHeight; p = s.progress; queue(); },
    onKill: () => { alive = false; },
  });
  p = st.progress;
  queue();
}

/** The design's rv-up: fade in and rise 48px across the first part of the entry range. */
function rise(el: HTMLElement, upTo: number) {
  track(el, ({ cover, entry }) => {
    const t = span(cover, 0, entry(upTo));
    el.style.opacity = String(t);
    el.style.transform = t >= 1 ? '' : `translateY(${(48 * (1 - t)).toFixed(1)}px)`;
  });
}

/** Ask ScrollFx to wire up elements that mounted after the page loaded (load more, filters). */
export const rescanFx = () => window.dispatchEvent(new Event('fx:rescan'));

export function ScrollFx() {
  const path = usePathname();
  const [scan, setScan] = useState(0);
  const live = useRef(path);
  live.current = path;

  useEffect(() => {
    const on = () => setScan((s) => s + 1);
    window.addEventListener('fx:rescan', on);
    return () => window.removeEventListener('fx:rescan', on);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const $ = <T extends HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

    const ctx = gsap.context(() => {
      // footer headline
      $('.ct-h1, .ct-h2').forEach((el) => rise(el, 0.9));
      // inner page reveals
      $('.shot, .cv, .wkf-t, .bl-r, .pr-i, .ps, .xp-r, .ar-b > *')
        .filter((el) => !el.closest('.hpv'))
        .forEach((el) => rise(el, 0.6));
      // home: service lists
      $('.dp-col li').forEach((el) => rise(el, 0.8));

      // home: work index rows unroll from the top
      $('.idx .row').forEach((el) =>
        track(el, ({ cover, entry }) => {
          const t = span(cover, 0, entry(1));
          el.style.opacity = String(t);
          el.style.clipPath = t >= 1 ? '' : `inset(0 0 ${(100 * (1 - t)).toFixed(2)}% 0)`;
        }),
      );

      // home: both sides, the live site sweeps in across the slash
      $('.bs-pin').forEach((el) => {
        const stage = el.querySelector<HTMLElement>('.bs-stage');
        // while the frame is pinned, scroll sweeps the live site in from nearly all drawing to all live
        const set = (p: number) => stage?.style.setProperty('--sa', (0.04 + 0.96 * span(p, 0.06, 0.9)).toFixed(4));
        const st = ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', onUpdate: (s) => set(s.progress), onRefresh: (s) => set(s.progress) });
        set(st.progress);
      });

      // home: Both Sides arrives on bone and eases to ink while its heading comes up, so the frame lands on black.
      // about: Toolkit and Experience share that transition coming out of Process
      $('.both, .tk-xp').forEach((el) => {
        const set = (p: number) => el.style.setProperty('--bk', (p * p * (3 - 2 * p)).toFixed(4));
        const st = ScrollTrigger.create({ trigger: el, start: 'top 65%', end: 'top 15%', onUpdate: (s) => set(s.progress), onRefresh: (s) => set(s.progress) });
        set(st.progress);
      });

      // home: stats count up, then fill from outline to ink along the 23.6° cut
      $('.sx').forEach((el) => {
        const to = Number(el.style.getPropertyValue('--to')) || 0;
        const solid = el.querySelector<HTMLElement>('.sx-s');
        // numbered lists (contact steps, blog posts) keep their own number: counting up mid-scroll showed "01, 01" or "04, 03, 03"
        const count = !el.closest('.stx-s, .bl');
        track(el, ({ cover, entry }) => {
          if (count) el.style.setProperty('--n', String(Math.round(to * span(cover, entry(0.1), 0.45))));
          solid?.style.setProperty('--w', `${(100 * (1 - span(cover, 0.25, 0.55))).toFixed(2)}%`);
        });
      });
    });

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    const t = setTimeout(refresh, 400);

    return () => {
      clearTimeout(t);
      ctx.revert();
      // a rescan keeps the page, so only a route change clears triggers made outside this effect
      if (live.current !== path) ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, [path, scan]);

  return null;
}

