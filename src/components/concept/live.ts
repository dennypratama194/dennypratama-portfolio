'use client';

import { useEffect, type RefObject } from 'react';

export type Live = boolean | 'auto';

/**
 * Whether a concept frame should spend a frame drawing: it is switched on, on screen, and, with 'auto', not faded out
 * inside a hover preview. Every scene checks this before it draws, so a page full of concepts only animates the one you see.
 */
export function shouldDraw(el: HTMLElement, act: Live) {
  if (!act) return false;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0) return false;
  if (act === 'auto') {
    const shown = (n: Element | null) => !n || Number(getComputedStyle(n).opacity) > 0.02;
    if (!shown(el.closest('.sm')) || !shown(el.closest('.pv'))) return false;
  }
  return true;
}

/** Sections below a concept's hero start their animation the first time they show inside the scrolling frame. */
export function useSections(root: RefObject<HTMLElement | null>, full: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!full || !el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { root: el, threshold: 0.35 });
    el.querySelectorAll('.cx-sec').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [root, full]);
}

/** Pointer position inside an element, eased toward the real one each frame; off-screen when the pointer leaves. */
export function trackPointer(el: HTMLElement, box: () => DOMRect) {
  const m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, in: false };
  const move = (e: PointerEvent) => {
    const r = box();
    m.tx = e.clientX - r.left;
    m.ty = e.clientY - r.top;
    if (!m.in) { m.x = m.tx; m.y = m.ty; m.in = true; }
  };
  const leave = () => { m.tx = -1e4; m.ty = -1e4; m.in = false; };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return {
    m,
    ease: (k = 0.12) => { if (!m.in) { m.x = m.tx; m.y = m.ty; return; } m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; },
    off: () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); },
  };
}

/**
 * Runs a scene's setup only once its frame comes near the screen, and then in idle time, so a page carrying several
 * concepts pays nothing for them at load. Returns a disposer that also tears down whatever the setup returned.
 */
export function whenNear(el: HTMLElement, setup: () => (() => void) | void) {
  let off: (() => void) | void;
  let idle = 0;
  const ric = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1));
  const cic = window.cancelIdleCallback ?? window.clearTimeout;
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    idle = ric(() => { off = setup(); }, { timeout: 1200 });
  }, { rootMargin: '400px 0px' });
  io.observe(el);
  return () => { io.disconnect(); cic(idle); off?.(); };
}

