'use client';

import { useEffect, useRef } from 'react';
import { onFrame } from '@/lib/frame';
import { whenNear, shouldDraw, trackPointer, useSections, type Live } from './live';
import { LAND } from './land';

// name, lat, lon, zone, and which side its label sits on (so London and Berlin don't collide)
const CITIES: [string, number, number, string, number][] = [
  ['New York', 40.7, -74, 'America/New_York', 1], ['London', 51.5, -0.1, 'Europe/London', -1], ['Berlin', 52.5, 13.4, 'Europe/Berlin', 1],
  ['Jakarta', -6.2, 106.8, 'Asia/Jakarta', 1], ['São Paulo', -23.5, -46.6, 'America/Sao_Paulo', 1], ['Tokyo', 35.7, 139.7, 'Asia/Tokyo', 1],
];
const ARCS: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 4], [3, 5], [1, 3]];
const vec = (lat: number, lon: number): [number, number, number] => {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
};
const clock = (tz: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date());

/**
 * Morrow, the preview of the live tool (MORROW_URL): scheduling for teams spread across time zones. The hero is a globe of dots turning under a real
 * sun line, with the team's cities on it at their real local time; the pointer turns it. With `full`, the frame
 * scrolls on to the four working days sliding into line, and clocks that keep the actual time.
 */
export function MorrowScene({ active, full = false }: { active: Live; full?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const clocks = useRef<HTMLDivElement>(null);
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
      // an even spread of dots over the sphere, kept where there is land, with a sparse few over the sea
      const bits = Uint8Array.from(atob(LAND), (ch) => ch.charCodeAt(0));
      const land = (x: number, y: number, z: number) => {
        const i = Math.min(179, Math.floor(((Math.atan2(x, z) * 180) / Math.PI + 180) / 2));
        const j = Math.min(89, Math.floor((90 - (Math.asin(y) * 180) / Math.PI) / 2));
        const k = j * 180 + i;
        return (bits[k >> 3] >> (k & 7)) & 1;
      };
      const N = 9000;
      const pts: [number, number, number, number][] = [];
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const rr = Math.sqrt(1 - y * y);
        const x = Math.cos(ga * i) * rr;
        const z = Math.sin(ga * i) * rr;
        const l = land(x, y, z);
        if (l || i % 7 === 0) pts.push([x, y, z, l]);
      }
      const cities = CITIES.map(([n, la, lo, tz, side]) => ({ n, v: vec(la, lo), tz, side, t: clock(tz) }));
      let w = 0;
      let h = 0;
      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = c.clientWidth;
        h = c.clientHeight;
        c.width = Math.max(2, Math.round(w * dpr));
        c.height = Math.max(2, Math.round(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(c);
      const p = trackPointer(el, () => c.getBoundingClientRect());

      // where the sun is overhead right now, so the night side is the real night side
      const now = new Date();
      const utc = now.getUTCHours() + now.getUTCMinutes() / 60;
      const sunLon = (12 - utc) * 15;
      const day = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const dec = -23.44 * Math.cos(((2 * Math.PI) / 365) * ((now.getTime() - day.getTime()) / 864e5 + 10));
      const sun = vec(dec, sunLon);

      let spin = -20;
      let tilt = 0.32;
      const draw = (dt: number) => {
        if (w < 2 || h < 2) return;
        const s = w / 1440;
        p.ease(0.06);
        const on = p.m.in;
        // a big globe rising from the bottom edge like a horizon
        spin += dt * (on ? 4 + ((p.m.x / s - 720) / 500) * 30 : 6);
        tilt += ((on ? 0.42 + ((p.m.y / s - 600) / 400) * 0.25 : 0.42) - tilt) * 0.05;
        const cx = 720 * s;
        const cy = 1080 * s;
        const R = 660 * s;
        const ry = (-spin * Math.PI) / 180 - Math.PI / 2;
        const cyw = Math.cos(ry);
        const syw = Math.sin(ry);
        const ct = Math.cos(tilt);
        const st = Math.sin(tilt);
        const proj = ([x, y, z]: [number, number, number]) => {
          const x1 = x * cyw + z * syw;
          const z1 = -x * syw + z * cyw;
          const y1 = y * ct - z1 * st;
          const z2 = y * st + z1 * ct;
          return [cx + x1 * R, cy - y1 * R, z2] as const;
        };
        ctx.fillStyle = '#EEEAE1';
        ctx.fillRect(0, 0, w, h);
        // a soft halo where the sun side faces us
        const [sx, sy, sz] = proj(sun);
        const halo = ctx.createRadialGradient(sx, sy, 0, cx, cy, R * 1.25);
        halo.addColorStop(0, `rgba(255,107,44,${0.1 + Math.max(0, sz) * 0.12})`);
        halo.addColorStop(1, 'rgba(255,107,44,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);
        for (const v of pts) {
          const [x, y, z] = proj([v[0], v[1], v[2]]);
          if (z < -0.05) continue;
          const lit = v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2];
          const depth = 0.3 + z * 0.7;
          let r = 1.4 * s * (0.6 + z * 0.6);
          if (!v[3]) ctx.fillStyle = `rgba(21,19,15,${0.12 * depth})`;
          else if (Math.abs(lit) < 0.06) { ctx.fillStyle = `rgba(255,107,44,${depth})`; r *= 1.6; }
          else { ctx.fillStyle = `rgba(21,19,15,${Math.min(1, depth * 1.3) * (lit > 0 ? 0.95 : 0.4)})`; r *= 1.6; }
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // the team's links, lifted off the surface
        const tt = performance.now() / 1000;
        ARCS.forEach(([i, j], k) => {
          const A = cities[i].v;
          const B = cities[j].v;
          const om = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
          ctx.strokeStyle = 'rgba(255,107,44,.85)';
          ctx.lineWidth = Math.max(1, 1.6 * s);
          ctx.beginPath();
          let pen = false;
          const head = ((tt * 0.35 + k * 0.17) % 1.4);
          for (let q = 0; q <= 40; q++) {
            const f = q / 40;
            if (f > head || f < head - 0.6) { pen = false; continue; }
            const a = Math.sin((1 - f) * om) / Math.sin(om);
            const b = Math.sin(f * om) / Math.sin(om);
            const lift = 1 + Math.sin(Math.PI * f) * 0.18;
            const [x, y, z] = proj([(A[0] * a + B[0] * b) * lift, (A[1] * a + B[1] * b) * lift, (A[2] * a + B[2] * b) * lift]);
            if (z < -0.1) { pen = false; continue; }
            if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
          }
          ctx.stroke();
        });
        // labels only where the frame is big enough to read them
        const labels = s > 0.45;
        ctx.font = `500 ${13 * s}px ui-monospace, monospace`;
        cities.forEach((ci) => {
          const [x, y, z] = proj(ci.v);
          if (z < 0.05) return;
          ctx.fillStyle = '#FF6B2C';
          ctx.beginPath();
          ctx.arc(x, y, 4.5 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(21,19,15,${Math.min(1, z * 2)})`;
          if (!labels) return;
          const label = `${ci.n} ${ci.t}`;
          ctx.fillText(label, ci.side > 0 ? x + 10 * s : x - 10 * s - ctx.measureText(label).width, y - 8 * s);
        });
      };
      draw(0);

      let last = performance.now();
      let n = 0;
      let vis = false;
      const read = () => { vis = !reduce && shouldDraw(c, act.current); };
      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!vis) return;
        if (++n % 120 === 0) cities.forEach((ci) => (ci.t = clock(ci.tz)));
        draw(dt);
      };
      const stop = onFrame(read, tick);
      return () => { stop(); ro.disconnect(); p.off(); };
    });
  }, []);

  // the clocks keep real time while the frame is open
  useEffect(() => {
    const el = clocks.current;
    if (!full || !el) return;
    const set = () => el.querySelectorAll<HTMLElement>('[data-tz]').forEach((n) => (n.textContent = clock(n.dataset.tz!)));
    set();
    const id = window.setInterval(set, 5000);
    return () => window.clearInterval(id);
  }, [full]);

  useSections(root, full);

  // offsets as of October for the preview; the live tool reads them per date
  const rows: [string, number][] = [['New York', -4], ['London', 1], ['Berlin', 2], ['Jakarta', 7]];
  return (
    <div className={`cx mw${full ? ' cx-full' : ''}`} ref={root} data-lenis-prevent={full ? '' : undefined}>
      <section className="cx-hero">
        <canvas className="cx-cv" ref={cv} />
        <header className="cx-nav mw-nav">
          <span className="mw-links"><span>Planner</span><span>How it works</span><span>FAQ</span></span>
          <span className="cx-logo mw-logo">
            {/* two working days drawn as arcs over one horizon; the hours they share are the lens filled in between */}
            <svg viewBox="-0.5 9 29 10" aria-hidden="true"><path d="M10 18A8 8 0 0 1 14 11.07 8 8 0 0 1 18 18z" fill="var(--ac)" /><path d="M2 18a8 8 0 0 1 16 0M10 18a8 8 0 0 1 16 0M.5 18h27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Morrow
          </span>
          <span className="mw-act"><span>Why</span><span className="cx-btn">Plan a meeting</span></span>
        </header>
        <h3 className="mw-h"><span>Nine to five,</span><em>everywhere at once.</em></h3>
        <div className="mw-side">
          <p>Morrow finds the hours a spread-out team actually shares. When there are none, it takes turns, so nobody takes every call at midnight.</p>
          <span className="cx-btn cx-btn-a">Find our hours</span>
        </div>
        <span className="cx-chip mw-chip"><b />Sun line drawn for right now</span>
      </section>
      {full && (
        <>
          <section className="cx-sec mw-ov">
            <p className="cx-k">01 · Overlap</p>
            <h4>Four working days,<br />slid into line.</h4>
            <div className="mw-rows">
              {rows.map(([n, off], i) => (
                <div className="mw-row" key={n} style={{ '--off': off, '--dl': `${0.3 + i * 0.12}s` } as React.CSSProperties}>
                  <span className="mw-city">{n}<small>UTC{off > 0 ? '+' : '−'}{Math.abs(off)}</small></span>
                  <span className="mw-strip">
                    {Array.from({ length: 24 }, (_, u) => {
                      const l = (u + off + 24) % 24;
                      return <i key={u} className={l >= 9 && l < 17 ? 'on' : l >= 7 && l < 23 ? 'eve' : ''} />;
                    })}
                  </span>
                </div>
              ))}
              <span className="mw-win"><small>13:00–15:00 UTC · two hours, Jakarta opts in late</small></span>
            </div>
          </section>
          <section className="cx-sec mw-ty">
            <p className="cx-k">02 · Time</p>
            <h4 className="mw-big"><span>Your 9 am</span><span>is their <em>midnight.</em></span></h4>
            <div className="mw-clocks" ref={clocks}>
              {CITIES.slice(0, 4).map(([n, , , tz]) => <p key={n}><small>{n}</small><b data-tz={tz}>--:--</b></p>)}
            </div>
            <p className="cx-note">These clocks show the real time in each city, right now.</p>
          </section>
        </>
      )}
    </div>
  );
}

