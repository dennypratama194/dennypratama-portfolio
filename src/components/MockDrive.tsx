'use client';

import { useEffect } from 'react';
import { onFrame, setVar, viewH } from '@/lib/frame';

/**
 * Drives every BrowserShot on the page. 'rise' shots set --mk from 0 to 1 as they come up through the lower half of
 * the screen. Shots with a loop play it while the pointer is on them, or while they sit mid-screen on touch.
 * Reduced motion leaves every window in place and every loop on its poster.
 */
export function MockDrive() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fine = matchMedia('(hover: hover)').matches;
    const shots = Array.from(document.querySelectorAll<HTMLElement>('.bw'));
    const rise = shots.filter((el) => el.dataset.drive === 'rise').map((el) => ({ el, cur: 0 }));
    const offs: (() => void)[] = [];
    const loops = shots.map((el) => ({ el, v: el.querySelector('video') })).filter((x): x is { el: HTMLElement; v: HTMLVideoElement } => !!x.v);
    const play = (v: HTMLVideoElement, on: boolean) => {
      if (on) { v.play().then(() => v.classList.add('on')).catch(() => {}); } else { v.classList.remove('on'); v.pause(); }
    };
    if (fine) {
      loops.forEach(({ el, v }) => {
        const host = el.closest('a,button') ?? el;
        const enter = () => play(v, true);
        const leave = () => play(v, false);
        host.addEventListener('pointerenter', enter);
        host.addEventListener('pointerleave', leave);
        offs.push(() => { host.removeEventListener('pointerenter', enter); host.removeEventListener('pointerleave', leave); });
      });
    }
    rise.forEach((it) => it.el.style.setProperty('--mk', '0'));
    let rects: DOMRect[] = [];
    let loopRects: DOMRect[] = [];
    const read = () => {
      rects = rise.map((it) => it.el.getBoundingClientRect());
      if (!fine) loopRects = loops.map(({ el }) => el.getBoundingClientRect());
    };
    const write = () => {
      const vh = viewH();
      rise.forEach((it, i) => {
        const r = rects[i];
        if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;
        const t = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
        it.cur += (t - it.cur) * 0.12;
        setVar(it.el, '--mk', it.cur.toFixed(4));
      });
      if (!fine) loops.forEach(({ v }, i) => {
        const r = loopRects[i];
        const mid = r.top < vh * 0.7 && r.bottom > vh * 0.3;
        if (mid !== !v.paused) play(v, mid);
      });
    };
    const stop = onFrame(read, write);
    return () => { stop(); offs.forEach((f) => f()); loops.forEach(({ v }) => v.pause()); };
  }, []);
  return null;
}

