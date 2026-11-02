'use client';

import { useEffect, useRef } from 'react';
import { onFrame } from '@/lib/frame';

/** Wraps a list; its .hpv child follows the pointer while a row is hovered, leaning into its own speed. */
export function HoverPreview({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  const host = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = host.current;
    const pv = el?.querySelector<HTMLElement>('.hpv');
    if (!el || !pv || !window.matchMedia('(hover: hover)').matches) return;
    const m = { cx: 0, cy: 0 };
    const s = { x: 0, y: 0, r: 0, init: false };
    let on = false;
    const move = (e: PointerEvent) => { m.cx = e.clientX; m.cy = e.clientY; on = true; };
    const leave = () => { on = false; s.init = false; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    let wr: DOMRect | null = null;
    let pw = 0;
    const read = () => {
      if (!on) return;
      wr = el.getBoundingClientRect();
      pw = pv.offsetWidth;
    };
    const write = () => {
      if (!on || !wr) return;
      const half = pw / 2 + 24;
      const tx = Math.min(wr.width - half, Math.max(half, m.cx - wr.left + pw / 2 + 48));
      const ty = m.cy - wr.top;
      if (!s.init) { s.x = tx; s.y = ty; s.init = true; }
      const ox = s.x;
      s.x += (tx - s.x) * 0.14;
      s.y += (ty - s.y) * 0.14;
      s.r += (Math.max(-12, Math.min(12, (s.x - ox) * 0.5)) - s.r) * 0.12;
      pv.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${s.r.toFixed(2)}deg)`;
    };
    const stop = onFrame(read, write);
    return () => {
      stop();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);
  return <section ref={host} className={className} {...rest}>{children}</section>;
}

