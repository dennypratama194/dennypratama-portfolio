'use client';

import { useEffect, useRef } from 'react';
import { onFrame } from '@/lib/frame';

/** A skewed square that trails the pointer and reads data-cursor (link, view, read, scrub) from what it is over. */
export function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  const lbl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cur = el.current;
    if (!fine || reduce || !cur) return;
    const m = { cx: -300, cy: -300, px: -300, py: -300 };
    const move = (e: PointerEvent) => { m.cx = e.clientX; m.cy = e.clientY; };
    const over = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const c = t?.closest?.('[data-cursor]');
      const mode = c?.getAttribute('data-cursor') ?? '';
      if (cur.getAttribute('data-mode') !== mode) cur.setAttribute('data-mode', mode);
      const l = c?.getAttribute('data-cl');
      if (l && lbl.current) lbl.current.textContent = l;
    };
    const leave = () => { m.cx = -300; m.cy = -300; };
    const tick = () => {
      // at rest, write nothing
      if (Math.abs(m.cx - m.px) < 0.05 && Math.abs(m.cy - m.py) < 0.05) return;
      m.px += (m.cx - m.px) * 0.22;
      m.py += (m.cy - m.py) * 0.22;
      cur.style.transform = `translate3d(${m.px.toFixed(1)}px,${m.py.toFixed(1)}px,0)`;
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    const stop = onFrame(undefined, tick);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
      document.documentElement.removeEventListener('pointerleave', leave);
      stop();
    };
  }, []);

  return (
    <div className="cursor" ref={el} aria-hidden="true">
      <span className="cur-dot" />
      <span className="cur-lbl" ref={lbl}>Read</span>
    </div>
  );
}

