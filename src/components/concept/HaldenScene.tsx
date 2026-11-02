'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { onFrame } from '@/lib/frame';
import { whenNear, shouldDraw, trackPointer, useSections, type Live } from './live';

// concept data for the dashboard, in $k of MRR per month: new, expansion and churned
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const MOVES: [number, number, number][] = [[9.2, 2.8, 3.6], [10.4, 3.1, 4.0], [9.6, 3.6, 3.2], [11.6, 4.0, 4.4], [12.4, 3.6, 3.6], [11.2, 4.8, 4.0], [13.6, 4.4, 3.2], [14.4, 5.2, 4.8], [13.2, 5.6, 3.6], [15.6, 6.0, 4.0], [16.8, 5.6, 4.4], [18.0, 6.8, 3.6]];
// the chart runs from $0 to $30k: bars stand on one baseline, churn is drawn as its own dashed line
const TOP = 30;
const SPAN = 30;
const yOf = (v: number) => ((TOP - v) / SPAN) * 400;
const ARROW = (up: boolean) => <svg className="hd-ar" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? 'M5 8.5V1.5M2 4.5l3-3 3 3' : 'M5 1.5v7M2 5.5l3 3 3-3'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const k$ = (v: number) => `$${v.toFixed(1)}k`;
// billing events from invented customers: [company, event, plan, MRR change, logo colour]
const EVENTS: [string, string, string, number, string][] = [
  ['Fernway', 'Upgraded to Growth', 'Growth', 420, '#0EA5E9'], ['Kitebase', 'Trial converted', 'Starter', 89, '#F59E0B'],
  ['Hollowpeak', 'Removed 6 seats', 'Growth', -160, '#64748B'], ['Tidewell', 'Added Forecasting', 'Scale', 240, '#10B981'],
  ['Marlow Labs', 'Trial converted', 'Growth', 349, '#EC4899'], ['Ondine', 'Cancelled', 'Starter', -89, '#8B5CF6'],
  ['Brightloop', 'Added 12 seats', 'Scale', 312, '#EF4444'], ['Cobaltline', 'Annual renewal', 'Scale', 0, '#2563EB'],
];
const SPARK: Record<string, number[]> = { mrr: [4, 5, 5, 6, 7, 7, 8, 9, 9, 10, 11, 12], arr: [3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 11, 12], cus: [6, 6, 7, 7, 8, 8, 8, 9, 10, 10, 11, 11], churn: [9, 8, 9, 7, 8, 6, 7, 6, 5, 6, 5, 4] };
const spark = (v: number[]) => v.map((y, i) => `${(i / (v.length - 1)) * 100},${30 - y * 2.2}`).join(' ');

// the integrations that orbit the hero: one generic glyph each, on one of two rings
const TILES: [string, number, number][] = [['card', 0, 0.2], ['chat', 0, 2.3], ['db', 0, 4.2], ['bars', 1, 0.9], ['bolt', 1, 2.0], ['mail', 1, 3.3], ['cloud', 1, 4.6], ['cal', 1, 5.6]];
const GLYPH: Record<string, React.ReactNode> = {
  card: <><rect x="3" y="6" width="18" height="12" rx="2.5" fill="#6D4AFF" /><rect x="3" y="9" width="18" height="2.5" fill="#fff" opacity=".8" /></>,
  chat: <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4 4v-4a3 3 0 0 1-3-3z" fill="#22C55E" />,
  db: <><ellipse cx="12" cy="6" rx="7" ry="3" fill="#F59E0B" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6c0 1.7-3.1 3-7 3S5 7.7 5 6z" fill="#F59E0B" opacity=".75" /></>,
  bars: <><rect x="4" y="12" width="4" height="8" rx="1" fill="#0EA5E9" /><rect x="10" y="7" width="4" height="13" rx="1" fill="#0EA5E9" /><rect x="16" y="3" width="4" height="17" rx="1" fill="#0EA5E9" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#EAB308" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" fill="#EF4444" /><path d="m4 7 8 6 8-6" stroke="#fff" strokeWidth="1.6" fill="none" /></>,
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z" fill="#6366F1" />,
  cal: <><rect x="4" y="5" width="16" height="15" rx="2.5" fill="#EC4899" /><rect x="4" y="5" width="16" height="4" rx="2" fill="#BE185D" /></>,
};

// the integrations row: tools a SaaS finance team really uses, named only, each on a plain monogram tile
const INTEG: [string, string, string][] = [
  ['Stripe', 'Billing', '#635BFF'], ['Chargebee', 'Billing', '#FF7846'], ['Paddle', 'Billing', '#1E293B'], ['Recurly', 'Billing', '#7C3AED'],
  ['HubSpot', 'CRM', '#FF7A59'], ['Salesforce', 'CRM', '#0EA5E9'], ['Slack', 'Alerts', '#4A154B'],
  ['QuickBooks', 'Accounting', '#2CA01C'], ['Xero', 'Accounting', '#13B5EA'], ['NetSuite', 'ERP', '#334155'], ['Snowflake', 'Warehouse', '#29B5E8'],
  ['BigQuery', 'Warehouse', '#4285F4'], ['Segment', 'Product data', '#10B981'], ['Notion', 'Reports', '#16141F'],
];

// the Halden mark: an H whose crossbar climbs, the way revenue should
const MARK = <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7.5v10M17 5v12.5M7 14.5l10-5" /></svg>;

// sidebar icons, drawn in one 24px line style
const ICON: Record<string, React.ReactNode> = {
  Overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  Revenue: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  Churn: <><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  Customers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7" /></>,
  Forecasts: <><path d="M3 20h18" /><path d="M4 16c3-1 4-7 7-7s3 4 6 3" /><path d="M17 12c1.5-.5 2.5-2 3.5-4" strokeDasharray="1.5 2.5" /></>,
  Plans: <><path d="M12 3 3 7.5l9 4.5 9-4.5z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></>,
  Invoices: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h5" /></>,
  Integrations: <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /><path d="M10.5 7h4a3 3 0 0 1 3 3v3.5M13.5 17h-4a3 3 0 0 1-3-3v-3.5" /></>,
  Settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
};
const Ico = ({ n }: { n: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICON[n]}</svg>;

// illustrated people for the proof row and the signed-in user: [backdrop, skin, hair, shirt, hairstyle]
const PEOPLE: [string, string, string, string, number][] = [
  ['#E9E3FF', '#F1C7A5', '#2B2118', '#6D4AFF', 1], ['#FFE8D2', '#8D5A3B', '#1C1410', '#F59E0B', 3],
  ['#D9F5E8', '#E8B48F', '#7A4A2A', '#10B981', 0], ['#FDE2EC', '#C98E6B', '#3A2A20', '#EC4899', 2],
];
function Face({ p }: { p: number }) {
  const [bg, skin, hair, shirt, st] = PEOPLE[p];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill={bg} />
      {st === 1 && <path d="M11 31c-1.3-6-1.3-11 0-15.5C12.3 9.4 16 7 20 7s7.7 2.4 9 8.5c1.3 4.5 1.3 9.5 0 15.5z" fill={hair} />}
      <path d="M6 41c0-8 6-12.5 14-12.5S34 33 34 41z" fill={shirt} />
      <rect x="17" y="21" width="6" height="8.5" rx="2.5" fill={skin} />
      <ellipse cx="20" cy="17.5" rx="7" ry="8" fill={skin} />
      {st === 0 && <path d="M12.7 17c-.9-6.4 2.6-10.3 7.3-10.3s8.2 3.6 7.3 10.3c-.8-3.4-2.6-5.4-7.3-5.4s-6.5 2-7.3 5.4z" fill={hair} />}
      {st === 1 && <path d="M12.8 16c.6-5.3 3.5-8 7.2-8s6.6 2.7 7.2 8c-2-2.3-4.1-3.4-7.2-3.6-3 .2-5.2 1.3-7.2 3.6z" fill={hair} />}
      {st === 2 && <><circle cx="20" cy="7.2" r="3.6" fill={hair} /><path d="M12.8 16.5c.3-5.6 3.3-8.6 7.2-8.6s6.9 3 7.2 8.6c-2.4-2.6-4.4-3.6-7.2-3.6s-4.8 1-7.2 3.6z" fill={hair} /></>}
      {st === 3 && <g fill={hair}>{[[13, 13], [15.5, 9.6], [19.5, 8.2], [23.5, 9.2], [26.5, 12.4], [14, 16.5], [26.4, 16]].map(([x, y]) => <circle key={x * 100 + y} cx={x} cy={y} r="3.4" />)}</g>}
    </svg>
  );
}

/**
 * Halden, a concept: revenue analytics for SaaS teams, as a bright product launch page. The integrations orbit the
 * headline on two rings that lean away from the pointer, and the full dashboard rises underneath, live. With `full`,
 * the frame scrolls on to a bento of metrics and a churn list that fills by risk.
 */
export function HaldenScene({ active, full = false }: { active: Live; full?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const dash = useRef<HTMLDivElement>(null);
  const mrr = useRef<HTMLElement>(null);
  const feed = useRef<HTMLOListElement>(null);
  const act = useRef(active);
  act.current = active;

  // the rings turn slowly; each tile rides its ring, and the rings drift away from the pointer, the outer one more
  useEffect(() => {
    const o = orbit.current;
    const el = root.current;
    if (!o || !el) return;
    return whenNear(el, () => {
      const tiles = Array.from(o.querySelectorAll<HTMLElement>('.hd-tile'));
      const rings = Array.from(o.querySelectorAll<HTMLElement>('.hd-ring-o'));
      const p = trackPointer(el, () => o.getBoundingClientRect());
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let t = 0;
      let last = performance.now();
      // the frame's size, measured in the frame's reading half; the first placement measures for itself
      let ow = 0;
      let oh = 0;
      const place = () => {
        const w = ow || o.clientWidth;
        const u = w / 1440;
        const mx = p.m.in ? p.m.x / w - 0.5 : 0;
        const my = p.m.in ? p.m.y / (oh || o.clientHeight || 1) - 0.5 : 0;
        rings.forEach((r, i) => { r.style.transform = `translate(${(-mx * (i + 1) * 14 * u).toFixed(1)}px,${(-my * (i + 1) * 10 * u).toFixed(1)}px)`; });
        tiles.forEach((n, i) => {
          const [, ring, a0] = TILES[i];
          const R = (ring ? 600 : 420) * u;
          const a = a0 + t * (ring ? -0.045 : 0.07);
          const x = 720 * u + Math.cos(a) * R - mx * (ring + 1) * 14 * u;
          const y = 360 * u + Math.sin(a) * R * 0.62 - my * (ring + 1) * 10 * u;
          n.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
          // tiles fade back as they slide under the headline or the nav, so neither is ever covered
          const cx = Math.abs(Math.cos(a) * R / u) - 330;
          const cy = Math.max(-200 - Math.sin(a) * R * 0.62 / u, Math.sin(a) * R * 0.62 / u - 170);
          const out = Math.max(cx, cy);
          const top = 360 + Math.sin(a) * R * 0.62 / u - 150;
          n.style.opacity = Math.min(1, Math.max(0.12, out / 70), Math.max(0.12, top / 70)).toFixed(2);
        });
      };
      place();
      let vis = false;
      const read = () => {
        vis = !reduce && shouldDraw(o, act.current);
        if (vis) { ow = o.clientWidth; oh = o.clientHeight; }
      };
      const tick = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!vis) return;
        t += dt;
        p.ease(0.06);
        place();
      };
      const stop = onFrame(read, tick);
      return () => { stop(); p.off(); };
    });
  }, []);

  // the dashboard leans toward the pointer, and the MRR ticks up while the frame is on show
  useEffect(() => {
    const d = dash.current;
    const el = root.current;
    if (!d || !el) return;
    const hero = el.querySelector('.cx-hero') as HTMLElement;
    const move = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(d, { '--ry': `${x * 6}deg`, '--rx': `${8 - y * 5}deg`, duration: 0.8, ease: 'power3.out', overwrite: true });
    };
    const leave = () => gsap.to(d, { '--ry': '0deg', '--rx': '8deg', duration: 1.2, ease: 'expo.out', overwrite: true });
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    // billing events arrive in the feed and move the MRR by exactly their amount; times age as new ones land
    let v = 248310;
    let k = 0;
    const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : `${m}m ago`; };
    const push = (t: number) => {
      const ol = feed.current;
      if (!ol) return;
      const [who, what, plan, amt, col] = EVENTS[k++ % EVENTS.length];
      const li = document.createElement('li');
      li.dataset.t = String(t);
      li.className = amt < 0 ? 'neg' : amt === 0 ? 'nil' : '';
      li.innerHTML = `<i style="background:${col}">${who[0]}</i><span><b>${who}</b><small>${what} · ${plan}</small></span><span class="hd-amt"><em>${amt === 0 ? '$0' : `${amt < 0 ? '−' : '+'}$${Math.abs(amt)}`}<small>/mo</small></em><small>${ago(t)}</small></span>`;
      ol.prepend(li);
      while (ol.children.length > 6) ol.lastElementChild!.remove();
      ol.querySelectorAll<HTMLElement>('li').forEach((n) => { n.querySelector('.hd-amt>small')!.textContent = ago(Number(n.dataset.t)); });
      return amt;
    };
    // the feed opens with a few events from earlier, so it is never empty
    [14, 9, 5, 2].forEach((m) => push(Date.now() - m * 60000));
    const id = window.setInterval(() => {
      if (!mrr.current || !shouldDraw(el, act.current)) return;
      v += push(Date.now()) ?? 0;
      mrr.current.textContent = `$${v.toLocaleString('en-US')}`;
    }, 4200);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); window.clearInterval(id); };
  }, []);

  useSections(root, full);

  // [account, plan and MRR, signal, risk, logo colour]
  const risk: [string, string, string, number, string][] = [
    ['Hollowpeak', 'Growth · $1,240/mo', 'Seats down 30% this month', 0.86, '#64748B'], ['Ondine', 'Starter · $89/mo', 'No admin login in 21 days', 0.71, '#8B5CF6'],
    ['Quarrel & Co', 'Scale · $2,900/mo', 'Downgraded plan, then exported data', 0.64, '#0EA5E9'], ['Kitebase', 'Starter · $178/mo', 'Support tickets up, usage flat', 0.42, '#F59E0B'],
    ['Fernway', 'Growth · $860/mo', 'Card expires before renewal', 0.33, '#10B981'],
  ];
  return (
    <div className={`cx hd${full ? ' cx-full' : ''}`} ref={root} data-lenis-prevent={full ? '' : undefined}>
      <section className="cx-hero">
        <div className="hd-orbit" ref={orbit} aria-hidden="true">
          <span className="hd-ring-o r0" /><span className="hd-ring-o r1" />
          {TILES.map(([g]) => <span className="hd-tile" key={g}><svg viewBox="0 0 24 24">{GLYPH[g]}</svg></span>)}
        </div>
        <header className="cx-nav hd-nav">
          <span className="cx-logo"><i>{MARK}</i>Halden</span>
          <span className="hd-links"><span>Features</span><span>How it works</span><span>Pricing</span><span>Customers</span></span>
          <span className="cx-btn">Book a demo</span>
        </header>
        <div className="hd-c">
          <span className="hd-proof"><span className="hd-faces">{[0, 1, 2, 3].map((p) => <Face key={p} p={p} />)}</span><b>Built for SaaS finance teams</b></span>
          <h3 className="hd-h">Revenue you can<br />see coming</h3>
          <p>Halden reads your billing and product data and shows MRR, churn and expansion as they happen, so the board deck writes itself.</p>
          <span className="hd-ctas"><span className="cx-btn">Start free trial</span><span className="cx-btn hd-ghost">See the demo</span></span>
        </div>
        <div className="hd-dash" ref={dash} aria-hidden="true">
          <aside className="hd-sb">
            <span className="cx-logo"><i>{MARK}</i>Halden</span>
            <span className="hd-ws"><b>A</b><span>Acme Cloud<small>Growth plan</small></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m8 10 4-4 4 4M8 14l4 4 4-4" /></svg></span>
            <p className="hd-sbk">Analytics</p>
            <nav>{['Overview', 'Revenue', 'Churn', 'Customers', 'Forecasts'].map((n, i) => <span key={n} className={i === 0 ? 'on' : ''}><Ico n={n} />{n}{n === 'Churn' && <em>3</em>}</span>)}</nav>
            <p className="hd-sbk">Billing</p>
            <nav>{['Plans', 'Invoices', 'Integrations'].map((n) => <span key={n}><Ico n={n} />{n}</span>)}</nav>
            <nav className="hd-sbe"><span><Ico n="Settings" />Settings</span></nav>
            <span className="hd-me"><Face p={2} /><span>Maya Ortiz<small>Finance lead</small></span></span>
          </aside>
          <div className="hd-main">
            <div className="hd-top">
              <span className="hd-ttl"><b>Overview</b><small><i />Synced with billing just now</small></span>
              <span className="hd-srch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>Search customers<kbd>⌘K</kbd></span>
              <span className="hd-pill"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>Nov 2025 – Oct 2026</span>
              <span className="hd-pill hd-exp">Export</span>
              <span className="hd-av"><Face p={2} /></span>
            </div>
            <div className="hd-kpis">
              {([['MRR', '$248,310', '4.2%', 'mrr', true], ['ARR', '$2.98M', '38%', 'arr', true], ['Paying customers', '1,284', '61', 'cus', true], ['Logo churn', '2.7%', '0.4 pts', 'churn', false]] as const).map(([l, val, d, sk, up], i) => (
                <span key={l}>
                  <small>{l}</small>
                  <b ref={i === 0 ? mrr : undefined}>{val}</b>
                  <span className="hd-dl"><em className={up ? '' : 'dn'}>{ARROW(up)}{d}</em>vs Sep</span>
                  <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><polyline points={spark(SPARK[sk])} /></svg>
                </span>
              ))}
            </div>
            <div className="hd-row">
              <div className="hd-chart">
                <div className="hd-chd">
                  <span><small>Net new MRR · October</small><b>$21,200</b><em>{ARROW(true)}17.8% vs Sep</em></span>
                  <span className="hd-seg"><span>30D</span><span>6M</span><span className="on">12M</span></span>
                </div>
                <p className="hd-leg"><span><i className="n" />New</span><span><i className="x" />Expansion</span><span><i className="cl" />Churned</span><span><i className="l" />Net new</span></p>
                <div className="hd-plot">
                  <span className="hd-yax">{['$30k', '$20k', '$10k', '$0'].map((t, i) => <span key={t} style={{ top: `${(i * 100) / 3}%` }}>{t}</span>)}</span>
                  <div className="hd-bars">
                    {MOVES.map(([n, x, c], i) => (
                      <span key={i} className={`hd-col${i === MOVES.length - 1 ? ' pin' : ''}`} style={{ '--bn': n / SPAN, '--bx': x / SPAN, '--dl': `${0.6 + i * 0.05}s` } as React.CSSProperties}>
                        <i className="n" /><i className="x" />
                        <span className={`tip${i > 5 ? ' r' : ''}`}><b>{MONTHS[i]} {i < 2 ? 2025 : 2026}</b><span><i className="n" />New<em>{k$(n)}</em></span><span><i className="x" />Expansion<em>{k$(x)}</em></span><span><i className="c" />Churned<em>−{k$(c)}</em></span><span className="net">Net new<em>{k$(n + x - c)}</em></span></span>
                      </span>
                    ))}
                    <svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><path className="hd-churn" d={MOVES.map(([, , c], i) => `${i ? 'L' : 'M'}${i * 100 + 50} ${yOf(c)}`).join(' ')} /><path className="hd-line" pathLength={1} d={MOVES.map(([n, x, c], i) => `${i ? 'L' : 'M'}${i * 100 + 50} ${yOf(n + x - c)}`).join(' ')} /></svg>
                  </div>
                  <span />
                  <span className="hd-xax">{MONTHS.map((m) => <span key={m}>{m}</span>)}</span>
                </div>
              </div>
              <div className="hd-feed"><p><b>Live billing</b><span className="hd-live"><span className="hd-dot" />Live</span></p><ol ref={feed} /></div>
            </div>
          </div>
        </div>
      </section>
      {full && (
        <>
          <section className="cx-sec hd-lg">
            <p>Connects to the stack your finance team already runs on</p>
            {[INTEG.slice(0, 7), INTEG.slice(7)].map((row, r) => (
              <div className={`hd-mq${r ? ' rev' : ''}`} key={r}>
                <div>{[...row, ...row, ...row].map(([n, cat, col], i) => <span key={i} aria-hidden={i >= row.length || undefined}><i style={{ background: col }}>{n[0]}</i><b>{n}</b><small>{cat}</small></span>)}</div>
              </div>
            ))}
            <p className="cx-note">Concept. Integrations are illustrative, shown by name only.</p>
          </section>
          <section className="cx-sec hd-bt">
            <p className="cx-k">01 · Metrics</p>
            <h4>Every number the board<br />asks for, already live.</h4>
            <div className="hd-bento">
              <div className="hd-b hd-b1"><small>MRR, last 12 months</small>
                <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true"><path className="hd-line" pathLength={1} d="M0 200 C80 190 120 176 180 170 S280 140 330 132 S430 90 480 76 S560 40 600 24" /></svg>
              </div>
              <div className="hd-b hd-b2"><small>Logo churn</small><span className="hd-ring" style={{ '--p': 0.027 } as React.CSSProperties}><b>2.7%</b></span></div>
              <div className="hd-b hd-b3"><small>Net revenue retention</small><b className="hd-big">112%</b><span className="hd-up">Up from 104%</span></div>
              <div className="hd-b hd-b4"><small>Cohorts, revenue kept by month</small>
                <span className="hd-coh">{Array.from({ length: 36 }, (_, i) => { const r = Math.floor(i / 6); const c = i % 6; return <i key={i} style={{ '--v': c > 5 - r ? 0 : 1 - c * 0.09 - r * 0.03, '--dl': `${(r + c) * 0.06}s` } as React.CSSProperties} />; })}</span>
              </div>
            </div>
            <p className="cx-note">Concept data, for a made-up company.</p>
          </section>
          <section className="cx-sec hd-ch">
            <p className="cx-k">02 · Churn signals</p>
            <h4>Know who is leaving<br />before they do.</h4>
            <div className="hd-rt">
              <p className="hd-rh"><span>Account</span><span>Strongest signal</span><span>Cancel risk, 90 days</span></p>
              <ol className="hd-risk">
                {risk.map(([n, plan, why, r, col], i) => (
                  <li key={n} className={r > 0.6 ? 'hi' : r > 0.4 ? 'md' : 'lo'} style={{ '--r': r, '--dl': `${0.2 + i * 0.12}s` } as React.CSSProperties}>
                    <span className="hd-acc"><i style={{ background: col }}>{n[0]}</i><span>{n}<small>{plan}</small></span></span>
                    <span className="hd-why">{why}</span>
                    <span className="hd-bar"><i /></span>
                    <b>{Math.round(r * 100)}%</b>
                  </li>
                ))}
              </ol>
            </div>
            <p className="cx-note">Concept data. Risk is the chance the account cancels within 90 days.</p>
          </section>
        </>
      )}
    </div>
  );
}

