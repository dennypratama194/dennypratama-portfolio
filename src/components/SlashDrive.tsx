'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { onFrame, setVar, viewH } from '@/lib/frame';
import { slashAt } from '@/lib/slash';

type Item = { el: HTMLElement; cur: number; base: number; on: boolean; px: number; py: number; sweep: boolean; running: boolean };

/**
 * Moves the slash on every SlashShot that asks for it. 'scroll' shots open from drawing to live as they cross the
 * middle half of the screen; 'sweep' shots run once from drawing to live on arrival. Wherever there is a pointer,
 * it takes over the slash while it is on the shot, and lets go when it leaves. Reduced motion holds every shot at 50/50.
 */
export function SlashDrive() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover)').matches;
    const items: Item[] = Array.from(document.querySelectorAll<HTMLElement>('.sl[data-drive]')).map((el) => ({
      el, cur: 0, base: 0, on: false, px: 0, py: 0, sweep: el.dataset.drive === 'sweep', running: false,
    }));
    if (reduce) {
      items.forEach((it) => it.el.style.setProperty('--s', '0.5'));
      return;
    }
    const offs: (() => void)[] = [];
    const tweens: gsap.core.Tween[] = [];
    items.forEach((it) => {
      if (it.sweep) {
        it.running = true;
        tweens.push(gsap.to(it, { base: 1, duration: 0.9, delay: 0.7, ease: 'expo.out', onComplete: () => { it.running = false; } }));
      }
      if (!fine) return;
      const move = (e: PointerEvent) => { const r = it.el.getBoundingClientRect(); it.on = true; it.running = false; it.px = e.clientX - r.left; it.py = e.clientY - r.top; };
      const leave = () => { it.on = false; };
      it.el.addEventListener('pointermove', move);
      it.el.addEventListener('pointerleave', leave);
      offs.push(() => { it.el.removeEventListener('pointermove', move); it.el.removeEventListener('pointerleave', leave); });
    });
    let rects: DOMRect[] = [];
    const read = () => { rects = items.map((it) => it.el.getBoundingClientRect()); };
    const write = () => {
      const vh = viewH();
      items.forEach((it, i) => {
        const r = rects[i];
        if (r.bottom < 0 || r.top > vh) return;
        if (!it.sweep) it.base = Math.min(1, Math.max(0, (vh * 0.75 - (r.top + r.height / 2)) / (vh * 0.5)));
        const t = it.on ? slashAt(it.px, it.py, r.width, r.height) : it.base;
        // the load sweep is already eased; everything else follows with the site's usual lag
        it.cur += (t - it.cur) * (it.running ? 1 : 0.14);
        setVar(it.el, '--s', it.cur.toFixed(4));
      });
    };
    const stop = onFrame(read, write);
    return () => {
      stop();
      tweens.forEach((t) => t.kill());
      offs.forEach((f) => f());
    };
  }, []);
  return null;
}

