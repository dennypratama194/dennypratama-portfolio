'use client';

import { useEffect, useRef, useState } from 'react';

export type Day = { day: string; views: number; visitors: number; time: number | null };
type Metric = { key: 'visitors' | 'views' | 'time'; label: string; value: string; delta: number | null };

const num = (n: number) => n.toLocaleString('en-US');
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
const fmt = (k: Metric['key'], v: number) => (k === 'time' ? dur(v) : num(v));
const label = (iso: string, long = false) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(long && { weekday: 'short', year: 'numeric' }), timeZone: 'UTC' });

// a round top for the y axis, so the grid reads 0 / 5 / 10 / 15 instead of 0 / 4.3 / 8.6
function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v / 4));
  const m = [1, 2, 2.5, 5, 10].find((f) => (f * step * 4) >= v)!;
  return m * step * 4;
}

const NAMES = { visitors: 'Visitors', views: 'Page views', time: 'Avg. time' } as const;
const H = 260, PAD = { t: 12, r: 8, b: 32, l: 40 };

// a monotone cubic through the points (Fritsch–Carlson): rounds the corners without overshooting,
// so a curve between two days never dips below zero or peaks above the real value
function curve(p: [number, number][]) {
  const n = p.length;
  if (n < 3) return p.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
  const d = p.slice(1).map(([px, py], i) => (py - p[i][1]) / (px - p[i][0]));
  const m = p.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let out = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[i + 1], h = (x1 - x0) / 3;
    out += `C${(x0 + h).toFixed(1)} ${(y0 + m[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)} ${(y1 - m[i + 1] * h).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return out;
}

function Chart({ data, k, weekly }: { data: Day[]; k: Metric['key']; weekly: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hi, setHi] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vals = data.map((d) => (k === 'time' ? d.time ?? 0 : d[k]));
  const top = k === 'time' ? Math.max(60, Math.ceil(Math.max(...vals) / 60) * 60) : niceMax(Math.max(...vals));
  const iw = w - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  const line = curve(vals.map((v, i) => [x(i), y(v)]));
  const area = `${line}L${x(vals.length - 1).toFixed(1)} ${PAD.t + ih}L${x(0).toFixed(1)} ${PAD.t + ih}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 90))));

  const move = (e: React.PointerEvent) => {
    const r = box.current!.querySelector('svg')!.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.l) / iw) * (data.length - 1));
    setHi(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <div className="adm-chart" ref={box} onPointerMove={move} onPointerLeave={() => setHi(null)}>
      <div className="adm-plot">
      <svg width={w} height={H} role="img" aria-label={`${k} per ${weekly ? 'week' : 'day'}`}>
        <defs>
          <linearGradient id="adm-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--a-accent)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--a-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="tick" x={PAD.l - 12} y={y(t)} textAnchor="end" dominantBaseline="middle">{k === 'time' ? `${Math.round(t / 60)}m` : num(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % every === 0 || i === data.length - 1) && (data.length - 1 - i >= every / 2 || i === data.length - 1) && (
          <text key={d.day} className="tick" x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{label(d.day)}</text>
        ))}
        <path d={area} fill="url(#adm-fill)" />
        <path d={line} className="ln" />
        {hi !== null && (
          <g>
            <line className="cross" x1={x(hi)} x2={x(hi)} y1={PAD.t} y2={PAD.t + ih} />
            <circle className="halo" cx={x(hi)} cy={y(vals[hi])} r="8" />
            <circle className="dot" cx={x(hi)} cy={y(vals[hi])} r="4" />
          </g>
        )}
      </svg>
      {hi !== null && (
        <div className="adm-tip" style={{ left: Math.min(Math.max(x(hi), 80), w - 80), top: y(vals[hi]) }}>
          <span>{weekly ? `Week of ${label(data[hi].day)}` : label(data[hi].day, true)}</span>
          <p><i />{NAMES[k]}<b>{fmt(k, vals[hi])}</b></p>
        </div>
      )}
      </div>
    </div>
  );
}

export function Overview({ metrics, data, weekly }: { metrics: Metric[]; data: Day[]; weekly: boolean }) {
  const [k, setK] = useState<Metric['key']>('visitors');
  return (
    <section className="adm-card adm-ov">
      <div className="adm-mtabs" role="tablist">
        {metrics.map((m) => (
          <button key={m.key} role="tab" aria-selected={m.key === k} onClick={() => setK(m.key)}>
            <span>{m.label}</span>
            <b>{m.value}</b>
            {m.delta !== null && Number.isFinite(m.delta) && (
              <em className={m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : ''}>{m.delta > 0 ? '↑' : m.delta < 0 ? '↓' : ''} {Math.abs(Math.round(m.delta))}%</em>
            )}
          </button>
        ))}
      </div>
      <Chart data={data} k={k} weekly={weekly} />
    </section>
  );
}

