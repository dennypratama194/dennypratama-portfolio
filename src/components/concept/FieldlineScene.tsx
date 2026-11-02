'use client';

import { useEffect, useRef } from 'react';
import { onFrame } from '@/lib/frame';
import { whenNear, shouldDraw, useSections, type Live } from './live';

/**
 * Fieldline, a concept: a wind-intelligence product for wind farms, built to show motion design.
 * The whole mock site is drawn at 1440 wide in --u units, so it scales to any frame.
 * The hero is a live flow field: a few thousand particles riding a wind made of layered sine waves,
 * bent by the pointer. With `full`, the frame scrolls through two more animated sections.
 * Nothing runs unless `active` is true, or, with 'auto', unless the frame is actually showing (in view and not
 * faded out by a hover preview). Reduced motion gets a single still frame.
 */
export function FieldlineScene({ active, full = false }: { active: Live; full?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const wind = useRef<HTMLSpanElement>(null);
  const act = useRef(active);
  act.current = active;

  useEffect(() => {
    const c = cv.current;
    const el = root.current;
    if (!c || !el) return;
    return whenNear(el, () => {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let w = 0;
      let h = 0;
      let dpr = 1;
      type P = { x: number; y: number; age: number; life: number };
      let ps: P[] = [];
      const spawn = (p: P) => {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.age = 0;
        p.life = 80 + Math.random() * 160;
        return p;
      };
      const size = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = c.clientWidth;
        h = c.clientHeight;
        c.width = Math.max(2, Math.round(w * dpr));
        c.height = Math.max(2, Math.round(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(Math.min(3400, (w * h) / 190));
        ps = Array.from({ length: n }, () => spawn({ x: 0, y: 0, age: 0, life: 0 }));
        ps.forEach((p) => (p.age = Math.random() * p.life));
        ctx.fillStyle = '#0A0D10';
        ctx.fillRect(0, 0, w, h);
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(c);

      const m = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4 };
      const onMove = (e: PointerEvent) => {
        const r = c.getBoundingClientRect();
        m.tx = e.clientX - r.left;
        m.ty = e.clientY - r.top;
      };
      const onLeave = () => { m.tx = -1e4; m.ty = -1e4; };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      // Every stream segment used to be its own stroke call. Grouped by colour and by opacity (in 16 steps, finer than
      // the eye picks out on a fading line), the field is 32 strokes a frame instead of one per particle.
      const B = 16;
      const styles = Array.from({ length: B * 2 }, (_, k) => {
        const o = (((k % B) + 0.5) / B) * 0.72;
        return k < B ? `rgba(236,234,228,${(o * 0.8).toFixed(3)})` : `rgba(124,245,200,${o.toFixed(3)})`;
      });
      const segs: number[][] = styles.map(() => []);

      let t = Math.random() * 100;
      const step = (dt: number) => {
        t += dt;
        m.x += (m.tx - m.x) * 0.12;
        m.y += (m.ty - m.y) * 0.12;
        const s = 1440 / Math.max(1, w); // field in design units, so a small frame looks like a big one
        ctx.fillStyle = 'rgba(10,13,16,0.075)';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = Math.max(0.6, w / 1440);
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          const x = p.x * s;
          const y = p.y * s;
          let a = Math.sin(x * 0.0032 + t * 0.35) * 1.1 + Math.cos(y * 0.0041 - t * 0.27) * 0.9 + Math.sin((x - y) * 0.0017 + t * 0.12) * 0.7 - 0.35;
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const d2 = dx * dx + dy * dy;
          const rr = (w * 0.14) ** 2;
          if (d2 < rr) a += (1 - d2 / rr) * 2.2; // the pointer is a gust: streams curl around it
          const v = (1.1 + Math.sin(y * 0.002 + t) * 0.35) * (w / 1440) * 1.9;
          const nx = p.x + Math.cos(a) * v;
          const ny = p.y + Math.sin(a) * v;
          const life = p.age / p.life;
          const o = Math.sin(life * Math.PI) * 0.72;
          const k = Math.min(B - 1, Math.floor((o / 0.72) * B)) + (i % 9 === 0 ? B : 0);
          segs[k].push(p.x, p.y, nx, ny);
          p.x = nx;
          p.y = ny;
          if (++p.age > p.life || nx < -4 || nx > w + 4 || ny < -4 || ny > h + 4) spawn(p);
        }
        for (let k = 0; k < segs.length; k++) {
          const g = segs[k];
          if (!g.length) continue;
          ctx.strokeStyle = styles[k];
          ctx.beginPath();
          for (let j = 0; j < g.length; j += 4) { ctx.moveTo(g[j], g[j + 1]); ctx.lineTo(g[j + 2], g[j + 3]); }
          ctx.stroke();
          g.length = 0;
        }
      };
      // warm the field up so the first frame already looks like wind
      for (let i = 0; i < 90; i++) step(1 / 60);

      let last = performance.now();
      let tick2 = 0;
      let vis = false;
      const read = () => { vis = !reduce && shouldDraw(c, act.current); };
      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!vis) return;
        step(dt);
        if (wind.current && ++tick2 % 20 === 0) wind.current.textContent = (11.4 + Math.sin(t * 0.7) * 1.3 + Math.sin(t * 2.3) * 0.3).toFixed(1);
      };
      const stop = onFrame(read, tick);
      return () => {
        stop();
        ro.disconnect();
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    });
  }, []);

  useSections(root, full);

  return (
    <div className={`fl${full ? ' fl-full' : ''}`} ref={root} data-lenis-prevent={full ? '' : undefined}>
      <section className="fl-hero">
        <canvas className="fl-cv" ref={cv} />
        <header className="fl-nav">
          <span className="fl-logo"><i />Fieldline</span>
          <span className="fl-links"><span>/Platform</span><span>/Forecasts</span><span>/Sites</span><span>/Pricing</span></span>
          <span className="fl-btn">Book a demo</span>
        </header>
        <span className="fl-chip"><b />Wind · <span ref={wind}>11.4</span> m/s NNE · Site 04, North Sea</span>
        <h3 className="fl-h">Read the wind<br /><em>before it turns.</em></h3>
        <div className="fl-side">
          <p>Fieldline forecasts output for wind farms 72 hours out, turbine by turbine, so traders sell what the farm will really make.</p>
          <span className="fl-btn fl-btn-l">See a live site</span>
        </div>
      </section>
      {full && (
        <>
          <section className="fl-sec cx-sec fl-fc">
            <p className="fl-k">01 · Forecast</p>
            <h4>Seventy-two hours,<br />one honest line.</h4>
            <svg className="fl-chart" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true">
              <path className="fl-band" d="M0 260 C120 200 200 170 300 190 S480 300 600 250 S780 110 900 150 S1100 260 1200 210 L1200 330 C1100 380 1000 300 900 280 S720 260 600 360 S420 330 300 300 S120 330 0 360 Z" />
              <path className="fl-line" pathLength={1} d="M0 310 C120 260 200 230 300 245 S480 330 600 305 S780 170 900 215 S1100 320 1200 270" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} className="fl-grid" x1={i * 200} x2={i * 200} y1="0" y2="420" />)}
            </svg>
            <div className="fl-axis"><span>Now</span><span>+24h</span><span>+48h</span><span>+72h</span></div>
            <p className="fl-note">Concept data. The band is the forecast&rsquo;s uncertainty, and it widens honestly with time.</p>
          </section>
          <section className="fl-sec cx-sec fl-st">
            <p className="fl-k">02 · Sites</p>
            <h4>Every turbine,<br />on one screen.</h4>
            <div className="fl-tg">
              {Array.from({ length: 40 }, (_, i) => (
                <span className="fl-t" key={i} style={{ '--sp': `${2.4 + ((i * 37) % 23) / 10}s`, '--dl': `${(i % 8) * 0.06 + Math.floor(i / 8) * 0.08}s` } as React.CSSProperties}>
                  <svg viewBox="-20 -20 40 40" aria-hidden="true"><g><path d="M0 0 L2 -17 L-2 -17 Z" /><path d="M0 0 L2 -17 L-2 -17 Z" transform="rotate(120)" /><path d="M0 0 L2 -17 L-2 -17 Z" transform="rotate(240)" /></g><circle r="2.2" /></svg>
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

