'use client';

import { useEffect, useRef } from 'react';
import { onFrame } from '@/lib/frame';
import { whenNear, shouldDraw, trackPointer, useSections, type Live } from './live';

// a fixed seed, so the graph is the same every visit
const rand = (s: number) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

type N = { x: number; y: number; ox: number; oy: number; g: number; e: number[]; hub?: string };

function graph() {
  const r = rand(29);
  const ns: N[] = [];
  const hubs: [string, number, number][] = [['planner', 720, 300], ['retrieve', 1020, 210], ['llm.call', 1130, 470], ['tool: sql', 820, 650], ['critic', 1300, 300], ['answer', 1290, 720]];
  hubs.forEach(([hub, x, y]) => ns.push({ x, y, ox: 0, oy: 0, g: 0, e: [], hub }));
  while (ns.length < 60) {
    // the graph lives in the right-hand panel; the left one holds the copy and the log
    const x = 600 + r() * 800;
    const y = 90 + r() * 780;
    if (ns.every((n) => (n.x - x) ** 2 + (n.y - y) ** 2 > 64 ** 2)) ns.push({ x, y, ox: 0, oy: 0, g: 0, e: [] });
  }
  ns.forEach((n, i) => {
    const near = ns.map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2] as const).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, n.hub ? 4 : 2);
    near.forEach(([j]) => { if (!n.e.includes(j)) { n.e.push(j); ns[j].e.push(i); } });
  });
  return ns;
}

/**
 * Noctua, a concept: tracing for AI agents. The hero is the agent's graph, live: requests run along it as amber
 * pulses and light each step they touch, and the pointer pushes the graph aside. With `full`, the frame scrolls on to
 * a trace that unrolls span by span and an eval grid that fills in.
 */
export function NoctuaScene({ active, full = false }: { active: Live; full?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const rate = useRef<HTMLSpanElement>(null);
  const log = useRef<HTMLOListElement>(null);
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
      const ns = graph();
      const r = rand(7);
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

      // a pulse is one request walking the graph, edge by edge
      type Pu = { a: number; b: number; t: number; hops: number; v: number };
      const ps: Pu[] = [];
      const next = (a: number) => ns[a].e[Math.floor(r() * ns[a].e.length)];
      const spawn = () => {
        const a = r() < 0.6 ? Math.floor(r() * 6) : Math.floor(r() * ns.length);
        ps.push({ a, b: next(a), t: 0, hops: 3 + Math.floor(r() * 5), v: 1.4 + r() * 1.4 });
      };
      // each time a request reaches a named step, the log on the left gets a line
    let lastSay = 0;
    const say = (hub: string) => {
      const ol = log.current;
      const now = performance.now();
      if (!ol || now - lastSay < 260) return;
      lastSay = now;
      const li = document.createElement('li');
      const ms = Math.round(40 + r() * (hub.startsWith('llm') ? 1400 : 380));
      const bad = r() < 0.06;
      li.innerHTML = `<span>${new Date().toISOString().slice(11, 23)}</span><b>${hub}</b><i>${ms} ms</i><em class="${bad ? 'bad' : ''}">${bad ? 'retry' : 'ok'}</em>`;
      ol.prepend(li);
      while (ol.children.length > 9) ol.lastElementChild!.remove();
    };
    let acc = 0;
      let count = 1180;

      const draw = (dt: number) => {
        if (w < 2 || h < 2) return;
        const s = w / 1440;
        p.ease(0.15);
        const mx = p.m.x / s;
        const my = p.m.y / s;
        for (const n of ns) {
          const dx = n.x - mx;
          const dy = n.y - my;
          const d2 = dx * dx + dy * dy;
          const f = d2 < 180 ** 2 ? (1 - Math.sqrt(d2) / 180) * 46 : 0;
          const d = Math.sqrt(d2) || 1;
          n.ox += ((dx / d) * f - n.ox) * 0.1;
          n.oy += ((dy / d) * f - n.oy) * 0.1;
          n.g = Math.max(0, n.g - dt * 1.4);
        }
        const X = (n: N) => (n.x + n.ox) * s;
        const Y = (n: N) => (n.y + n.oy) * s;

        ctx.fillStyle = '#0D0C0A';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = Math.max(0.5, s);
        ns.forEach((n, i) => n.e.forEach((j) => {
          if (j < i) return;
          const m = ns[j];
          const g = Math.max(n.g, m.g);
          ctx.strokeStyle = `rgba(237,231,219,${0.07 + g * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(X(n), Y(n));
          ctx.lineTo(X(m), Y(m));
          ctx.stroke();
        }));

        acc += dt;
        while (acc > 0.07) { acc -= 0.07; if (ps.length < 26) spawn(); }
        for (let i = ps.length - 1; i >= 0; i--) {
          const u = ps[i];
          const a = ns[u.a];
          const b = ns[u.b];
          u.t += dt * u.v;
          const t = Math.min(1, u.t);
          const x = X(a) + (X(b) - X(a)) * t;
          const y = Y(a) + (Y(b) - Y(a)) * t;
          const tx = X(a) + (X(b) - X(a)) * Math.max(0, t - 0.35);
          const ty = Y(a) + (Y(b) - Y(a)) * Math.max(0, t - 0.35);
          const gr = ctx.createLinearGradient(tx, ty, x, y);
          gr.addColorStop(0, 'rgba(255,181,71,0)');
          gr.addColorStop(1, 'rgba(255,181,71,.95)');
          ctx.strokeStyle = gr;
          ctx.lineWidth = Math.max(1, s * 2);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(x, y);
          ctx.stroke();
          if (u.t >= 1) {
            b.g = 1;
            count++;
            if (b.hub) say(b.hub);
            if (--u.hops <= 0) ps.splice(i, 1);
            else { u.a = u.b; u.b = next(u.b); u.t = 0; }
          }
        }

        ns.forEach((n) => {
          const rr = (n.hub ? 6 : 2.6) * s + n.g * 3 * s;
          if (n.g > 0.02 || n.hub) {
            ctx.fillStyle = `rgba(255,181,71,${n.hub ? 0.18 + n.g * 0.3 : n.g * 0.3})`;
            ctx.beginPath();
            ctx.arc(X(n), Y(n), rr * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = n.g > 0.1 || n.hub ? `rgba(255,${181 + n.g * 60},${71 + n.g * 140},1)` : 'rgba(237,231,219,.45)';
          ctx.beginPath();
          ctx.arc(X(n), Y(n), rr, 0, Math.PI * 2);
          ctx.fill();
          if (n.hub && s > 0.45) {
            ctx.font = `${13 * s}px ui-monospace, monospace`;
            ctx.fillStyle = `rgba(237,231,219,${0.55 + n.g * 0.45})`;
            ctx.fillText(n.hub, X(n) + 14 * s, Y(n) - 12 * s);
          }
        });
      };
      for (let i = 0; i < 40; i++) draw(1 / 30);

      let last = performance.now();
      let n = 0;
      let vis = false;
      const read = () => { vis = !reduce && shouldDraw(c, act.current); };
      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!vis) return;
        draw(dt);
        if (rate.current && ++n % 30 === 0) rate.current.textContent = count.toLocaleString('en-US');
      };
      const stop = onFrame(read, tick);
      return () => { stop(); ro.disconnect(); p.off(); };
    });
  }, []);

  useSections(root, full);

  const spans: [string, number, number, number][] = [
    ['agent.run', 0, 100, 0], ['plan', 1, 14, 1], ['retrieve · docs', 15, 18, 1], ['embed', 16, 6, 2], ['vector.search', 23, 9, 2],
    ['llm.call · draft', 34, 31, 1], ['tool: sql', 66, 12, 1], ['llm.call · check', 79, 15, 1], ['answer', 95, 5, 1],
  ];
  const r = rand(11);
  const cells = Array.from({ length: 84 }, () => r());
  return (
    <div className={`cx nc${full ? ' cx-full' : ''}`} ref={root} data-lenis-prevent={full ? '' : undefined}>
      <section className="cx-hero">
        <canvas className="cx-cv" ref={cv} />
        <header className="cx-nav nc-nav">
          <span className="cx-logo nc-logo">
            {/* an owl's face that is also two traced spans: the eyes are nodes, the brow is the edge between them */}
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3.5 6 9.5 9.6Q16 8.2 22.5 9.6L28.5 6v12.5a12.5 11.5 0 0 1-25 0z" fill="var(--ac)" /><path d="M7.5 11.8 16 15.6l8.5-3.8" fill="none" stroke="var(--bg)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="11.2" cy="17.6" r="3.9" fill="var(--bg)" /><circle cx="20.8" cy="17.6" r="3.9" fill="var(--bg)" /><circle cx="11.9" cy="17.6" r="1.5" fill="var(--ac)" /><circle cx="20.1" cy="17.6" r="1.5" fill="var(--ac)" /><path d="M14.7 21.8h2.6L16 24.6z" fill="var(--bg)" /></svg>
            noctua
          </span>
          <span className="nc-links"><span>Docs</span><span>Pricing</span><span>Changelog</span><span>Sign in</span></span>
        </header>
        <div className="nc-l">
          <span className="cx-chip nc-chip"><b />Live · <span ref={rate}>1,180</span> spans traced</span>
          <h3 className="nc-h">See what your agent was <em>thinking.</em></h3>
          <p>Noctua records every step an AI agent takes, from the plan to the last tool call, so when an answer goes wrong you can see the exact step where it turned.</p>
          <span className="cx-btn cx-btn-a">Open a trace</span>
          <div className="nc-log"><p><span>time</span><b>step</b><i>took</i><em>status</em></p><ol ref={log} aria-hidden="true" /></div>
        </div>
      </section>
      {full && (
        <>
          <section className="cx-sec nc-tr">
            <p className="cx-k">01 · Traces</p>
            <h4>Every step,<br />in the order it ran.</h4>
            <ol className="nc-wf">
              {spans.map(([n, x, wd, lv]) => (
                <li key={n} style={{ '--sx': x / 100, '--sw': wd / 100, '--dl': `${0.2 + x * 0.018}s`, '--lv': lv } as React.CSSProperties}>
                  <span className="nc-nm">{n}</span>
                  <span className="nc-tk"><i /><small>{Math.round(wd * 46)} ms</small></span>
                </li>
              ))}
            </ol>
            <p className="cx-note">Concept data. One run of a support agent, 4.6 seconds end to end.</p>
          </section>
          <section className="cx-sec nc-ev">
            <p className="cx-k">02 · Evals</p>
            <h4>Catch the regression<br />before your users do.</h4>
            <div className="nc-hm">
              {cells.map((v, i) => (
                <span key={i} className={v < 0.12 ? 'bad' : v < 0.3 ? 'mid' : ''} style={{ '--dl': `${(i % 14) * 0.04 + Math.floor(i / 14) * 0.07}s`, '--v': 0.35 + v * 0.65 } as React.CSSProperties} />
              ))}
            </div>
            <div className="nc-lg"><span><i />Pass</span><span><i className="mid" />Drifting</span><span><i className="bad" />Fail</span><span className="mute">14 test cases × the last 6 releases</span></div>
          </section>
        </>
      )}
    </div>
  );
}

