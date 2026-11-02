'use client';

import { useEffect, useState } from 'react';

type Probe = { gpu: string; mp4: string; webm: string };

const decode = async (contentType: string) => {
  try {
    const r = await navigator.mediaCapabilities.decodingInfo({ type: 'file', video: { contentType, width: 960, height: 600, bitrate: 600000, framerate: 30 } });
    if (!r.supported) return 'unsupported';
    return r.powerEfficient ? 'GPU (hardware)' : 'CPU (software)';
  } catch {
    return 'unknown';
  }
};

/**
 * A frame meter for testing on real devices: add ?perf=1 to any URL. It shows the frame rate the page is actually
 * getting, the slow frames, which GPU the browser drew with, whether the tunnel is live and at what quality, and
 * whether the loop's codecs decode in hardware. Nothing renders, and nothing runs, without the flag.
 */
export function PerfHud() {
  const [on, setOn] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [txt, setTxt] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('perf') !== '1') return;
    setOn(true);
    const c = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    const ext = c?.getExtension('WEBGL_debug_renderer_info');
    const gpu = !c ? 'no WebGL' : ext ? String(c.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(c.getParameter(c.RENDERER));
    c?.getExtension('WEBGL_lose_context')?.loseContext();
    Promise.all([decode('video/mp4; codecs="avc1.64001F"'), decode('video/webm; codecs="vp09.00.31.08"')]).then(([mp4, webm]) => setProbe({ gpu, mp4, webm }));

    const frames: number[] = [];
    let long = 0;
    let lo: PerformanceObserver | null = null;
    try {
      lo = new PerformanceObserver((l) => { long += l.getEntries().length; });
      lo.observe({ type: 'longtask' });
    } catch { /* Safari has no long task timing */ }
    let last = performance.now();
    let shown = last;
    let id = 0;
    const loop = (now: number) => {
      frames.push(now - last);
      if (frames.length > 120) frames.shift();
      last = now;
      if (now - shown > 500) {
        shown = now;
        const s = [...frames].sort((a, b) => a - b);
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const site = document.querySelector('.site')?.className ?? '';
        const gl = document.querySelector<HTMLCanvasElement>('canvas.gl');
        const tunnel = !gl ? 'not on this page' : site.includes('gl-on') ? `live, quality ${gl.dataset.q ?? '?'}` : site.includes('gl-fail') ? `fallback stills (${gl.dataset.why ?? '?'})` : 'starting';
        setTxt([
          `${(1000 / avg).toFixed(0)} fps · p95 ${s[Math.floor(s.length * 0.95)]?.toFixed(1)} ms · worst ${s[s.length - 1]?.toFixed(0)} ms`,
          `slow frames (>34 ms) ${frames.filter((f) => f > 34).length}/${frames.length} · long tasks ${long}`,
          `tunnel ${tunnel}`,
          `${navigator.hardwareConcurrency || '?'} cores · ${(navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? '?'} GB · dpr ${window.devicePixelRatio}`,
        ].join('\n'));
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); lo?.disconnect(); };
  }, []);

  if (!on) return null;
  return (
    <pre className="mono" aria-hidden="true" style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 500, margin: 0, padding: '8px 12px', maxWidth: 'calc(100vw - 16px)', whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: '16px', background: 'var(--ink)', color: 'var(--bone)', borderRadius: 'var(--r-s)', pointerEvents: 'none', opacity: 0.9 }}>
      {txt}
      {probe && `\ngpu ${probe.gpu}\nloop mp4 ${probe.mp4} · webm ${probe.webm}`}
    </pre>
  );
}

