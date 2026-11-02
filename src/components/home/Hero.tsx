'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { onFrame, setVar, viewH } from '@/lib/frame';
import { Arrow } from '../Icons';
import { Clock } from '../Clock';
import { useRootFlag } from '../Site';
import { lenis } from '../SmoothScroll';
import { compileProgram } from '@/lib/webgl';
import { CHAPTERS } from './chapters';


const VS = '#version 300 es\nin vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }';
const UNIFORMS = ['uRes', 'uTime', 'uRo', 'uCam', 'uTan', 'uTun', 'uEnd', 'uKey', 'uAccent', 'uSteps'] as const;
type U = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

const S = 6.4;
const NM = 13;
const cl = (x: number) => Math.min(1, Math.max(0, x));
const sm = (x: number) => x * x * (3 - 2 * x);

/** Camera path through the tunnel: dive 0.06–0.26, fly 0.26–0.90, exit 0.90–1.0. */
function camera(p: number, yaw: number, pitch: number, aspect: number) {
  const Z0 = 5.33 * Math.max(1, 0.78 / Math.max(0.3, aspect || 1.6));
  const k = (a: number, b: number) => cl((p - a) / (b - a));
  const dive = sm(k(0.06, 0.26));
  const fly = k(0.26, 0.9);
  const out = k(0.9, 1.0);
  const zEnd = -(NM - 1) * S;
  let z = Z0 * (1 - dive);
  if (p > 0.26) z = zEnd * fly;
  if (p > 0.9) z = zEnd - 4.0 * sm(out);
  const orb = 1 - dive;
  const yw = yaw * orb;
  const pt = pitch * orb;
  const ro = z > 0 ? [Math.sin(yw) * Math.cos(pt) * z, Math.sin(pt) * z, Math.cos(yw) * Math.cos(pt) * z] : [0, 0, z];
  let f = z > 0.001 ? [-ro[0], -ro[1], -ro[2]] : [0, 0, -1];
  const fl = Math.hypot(f[0], f[1], f[2]) || 1;
  f = [f[0] / fl, f[1] / fl, f[2] / fl];
  let r = [-f[2], 0, f[0]]; // cross(f, up) with up = y
  const rl = Math.hypot(r[0], r[1], r[2]) || 1;
  r = [r[0] / rl, r[1] / rl, r[2] / rl];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return {
    ro,
    cam: new Float32Array([r[0], r[1], r[2], u[0], u[1], u[2], -f[0], -f[1], -f[2]]),
    tan: 0.2679 + (0.36 - 0.2679) * dive,
    tun: 0.32 + 0.68 * k(0.04, 0.22),
    end: sm(k(0.92, 1.0)),
  };
}

export function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [fail, setFail] = useState(false);
  const [on, setOn] = useState(false);
  // the exit shot's images load only once the dive is well under way, so they never compete with the hero
  useRootFlag('gl-fail', fail);
  useRootFlag('gl-on', on);

  useEffect(() => {
    const wrap = wrapRef.current;
    const hero = heroRef.current;
    const cv = cvRef.current;
    if (!wrap || !hero || !cv) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // ?tunnel=force skips the device checks, for testing the WebGL path on any machine
    const force = new URLSearchParams(window.location.search).get('tunnel') === 'force';
    // Only phones and tablets are ruled out up front: a 4-core desktop usually has a GPU that draws the tunnel fine,
    // and the frame judge below catches the ones that don't. A phone with few cores or little memory never gets it.
    const touch = window.matchMedia('(hover: none)').matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    // WebKit reports a capped core count on iOS, so every iPhone read as a 4-core phone and only ever got the stills.
    // iPhones and iPads skip the up-front rule and are judged by their frames like desktops.
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const lowEnd = !force && touch && !ios && ((navigator.hardwareConcurrency || 8) <= 4 || mem <= 3);
    // why the tunnel fell back, for the ?perf=1 meter
    const why = (r: string) => { cv.dataset.why = r; };
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    let p = 0;
    let vis = false;
    let aspect = 1.6;
    let vh = 0;

    // Scroll progress through the tall wrap (620svh, 440svh on phones) drives the DOM layer (chapters, degree counter, the fade out) in CSS.
    // Measured in the frame's reading half, written in its writing half (see lib/frame).
    const measure = () => {
      const r = wrap.getBoundingClientRect();
      vh = viewH();
      const span = r.height - vh;
      p = span > 40 ? cl(-r.top / span) : 0;
      vis = r.bottom > 0 && r.top < vh;
      if (vis) aspect = cv.clientWidth / Math.max(1, cv.clientHeight);
    };
    const progress = () => {
      // the hero's height is the screen actually showing; iOS browsers disagree with their own svh/dvh (see home.css)
      setVar(hero, '--vh', `${vh}px`);
      setVar(hero, '--p', p.toFixed(4));
      setVar(hero, '--deg', String(Math.round(cl((p - 0.26) / 0.64) * 180)));
    };

    if (reduce || lowEnd) {
      why(reduce ? 'reduced motion is on' : 'low-end phone');
      setFail(true);
      return onFrame(measure, progress);
    }

    let gl: WebGL2RenderingContext | null = null;
    let res: { pr: WebGLProgram; buf: WebGLBuffer | null } | null = null;
    let u = {} as U;
    const controller = new AbortController();
    let ready = false;
    const init = async () => {
      try {
        gl = cv.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
        if (!gl) throw new Error('no webgl2');
        // a software renderer draws this shader at about a frame a second; treat it like no WebGL at all
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        cv.dataset.gpu = gpu;
        if (!force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) throw new Error(`software renderer: ${gpu}`);
        // Fallback devices never download the shader. A separate chunk also lets the intro paint first.
        const { TUNNEL_FS } = await import('./tunnelShader');
        controller.signal.throwIfAborted();
        const pr = await compileProgram(gl, VS, TUNNEL_FS, controller.signal);
        if (controller.signal.aborted) { gl.deleteProgram(pr); return; }
        // Record ownership before any other GL calls, so cleanup also covers a failed setup.
        res = { pr, buf: null };
        const buf = gl.createBuffer();
        res.buf = buf;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(pr, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.useProgram(pr);
        UNIFORMS.forEach((n) => (u[n] = gl!.getUniformLocation(pr, n)));
        ready = true;
        t0 = performance.now();
      } catch (e) {
        if (controller.signal.aborted) return;
        console.warn('Tunnel unavailable, showing the still.', e);
        why(String((e as Error)?.message ?? e).slice(0, 60));
        setFail(true);
        if (gl && res) { gl.deleteProgram(res.pr); gl.deleteBuffer(res.buf); res = null; }
      }
    };

    // Render below native resolution and step quality down when frames run long.
    let q = 0.62;
    let slow = 0;
    let last = 0;
    let first = true;
    let frames = 0; // shader compile and first uploads are slow; don't judge the device on them
    let severe = 0;
    let dead = false;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * q;
      const w = Math.max(2, Math.round(cv.clientWidth * dpr));
      const h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      cv.dataset.q = q.toFixed(2);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);

    const giveUp = (r: string) => {
      dead = true;
      why(r);
      const at = p;
      setFail(true);
      setOn(false);
      // Mid-dive the tall wrap collapses to one screen and the page under the reader's thumb jumps thousands of
      // pixels. Once the fallback has laid out, put them at the same point of the story frames instead.
      if (at > 0.02 && at < 0.98) requestAnimationFrame(() => requestAnimationFrame(() => {
        const st = document.querySelector<HTMLElement>('.story');
        if (!st) return;
        const r = st.getBoundingClientRect();
        const y = Math.round(window.scrollY + r.top + at * Math.max(0, r.height - viewH()));
        const l = lenis();
        if (l) l.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      }));
    };
    const lost = () => giveUp('WebGL context lost');
    cv.addEventListener('webglcontextlost', lost);

    const onMove = (e: PointerEvent) => {
      m.tx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      m.ty = -((e.clientY / (window.innerHeight || 1)) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // On a phone, tilt does what the pointer does on desktop. iOS asks first, so the question waits for a tap on the hero.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      m.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      m.ty = Math.max(-1, Math.min(1, (45 - e.beta) / 30));
    };
    type Ask = { requestPermission?: () => Promise<'granted' | 'denied'> };
    const ask = typeof DeviceOrientationEvent === 'undefined' ? undefined : (DeviceOrientationEvent as unknown as Ask).requestPermission;
    // a tap on the hero's own button is someone leaving, not an invitation to ask for the gyroscope
    const onTap = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('a,button')) return;
      hero.removeEventListener('click', onTap);
      ask?.().then((r) => { if (r === 'granted') window.addEventListener('deviceorientation', onTilt); }).catch(() => {});
    };
    if (touch && typeof DeviceOrientationEvent !== 'undefined') {
      if (ask) hero.addEventListener('click', onTap);
      else window.addEventListener('deviceorientation', onTilt);
    }

    let t0 = performance.now();
    let drawnP = -1;
    let skip = false;
    let gap = 1; // frames since the last drawn one, so a skipped frame doesn't read as a slow one
    const tick = () => {
      progress();
      if (dead || !ready || !gl || !vis || document.hidden) { last = 0; return; }
      const now = performance.now();
      const t = (now - t0) / 1000;
      m.x += (m.tx - m.x) * 0.05;
      m.y += (m.ty - m.y) * 0.05;
      // At rest (no scroll, pointer settled) the tunnel only drifts slowly, so it draws every other frame and the
      // GPU idles half the time. The judge splits the time since the last draw over the frames in between, so a
      // deliberate gap never reads as a slow device, and a slow one is still caught at rest. (Resetting the judge
      // on skipped frames meant it never ran at rest: an undetected slow GPU held the page for 15 s before giving up.)
      const idle = p === drawnP && Math.abs(m.tx - m.x) < 0.002 && Math.abs(m.ty - m.y) < 0.002;
      skip = idle && !skip;
      if (skip) { if (last) gap++; return; }
      drawnP = p;
      const yaw = 0.17 * Math.sin(t * 0.21) + m.x * 0.38;
      const pitch = 0.05 + 0.05 * Math.sin(t * 0.17) - m.y * 0.2;
      const c = camera(p, yaw, pitch, aspect);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform1f(u.uTime, t);
      gl.uniform3f(u.uRo, c.ro[0], c.ro[1], c.ro[2]);
      gl.uniformMatrix3fv(u.uCam, false, c.cam);
      gl.uniform1f(u.uTan, c.tan);
      gl.uniform1f(u.uTun, c.tun);
      gl.uniform1f(u.uEnd, c.end);
      gl.uniform3f(u.uKey, -0.6 + m.x * 0.7, 0.7 + m.y * 0.45, 0.8);
      gl.uniform3f(u.uAccent, 0.62, 0.6, 0.57);
      gl.uniform1f(u.uSteps, 150);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) { first = false; setOn(true); }
      // judge after 60 frames or 1.5s, whichever comes first: on a device drawing a frame a second, 60 frames is a minute
      if (last && (++frames > 60 || now - t0 > 1500)) {
        const dt = (now - last) / gap;
        // two frames in a row over a quarter second: no quality step will save it
        severe = dt > 250 ? severe + 1 : 0;
        if (severe >= 2 && !force) { giveUp('frames over 250 ms'); return; }
        slow = slow * 0.95 + (dt > 34 ? 1 : 0) * 0.05;
        if (slow > 0.6) {
          slow = 0;
          if (q > 0.42) { q = Math.max(0.42, q - 0.1); size(); }
          else if (!force) giveUp('too slow at lowest quality'); // still too slow at the lowest quality: fall back to the still and the frames
        }
      }
      last = now;
      gap = 1;
    };
    const stop = onFrame(measure, tick);
    void init();

    return () => {
      controller.abort();
      stop();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('deviceorientation', onTilt);
      hero.removeEventListener('click', onTap);
      cv.removeEventListener('webglcontextlost', lost);
      // Free our resources but keep the context: React remounts effects in dev, and a canvas
      // whose context was force-lost hands back the same dead context on the next getContext().
      if (gl && res) { gl.deleteProgram(res.pr); gl.deleteBuffer(res.buf); }
    };
  }, []);

  return (
    <div className="hero-wrap" ref={wrapRef}>
      <section className="hero" ref={heroRef} aria-labelledby="hero-h1">
        <h1 className="sr" id="hero-h1">Denny Pratama, product designer. I design it. I build it.</h1>
        <div className="sr">{CHAPTERS.map((c) => c[1]).join(' ')}</div>
        <canvas className="gl" ref={cvRef} aria-hidden="true" />
        <div className="gl-still" aria-hidden="true">
          <Image src="/img/tun-hero-bw.webp" alt="" fill priority fetchPriority="high" sizes="100vw" />
        </div>
        <div className="hu">
          <div className="hu-top">
            <p className="mono">Product designer</p>
            <p className="mono">Indonesia · <Clock /> GMT+7</p>
          </div>
          <div className="hu-d" aria-hidden="true"><span className="hl hl-d">I design it.</span></div>
          <div className="hu-p" aria-hidden="true"><span className="hl hl-p">I build it.</span></div>
          <div className="hu-bl">
            <p className="lead">Eight years designing SaaS products and dashboards. Now I build them too, so what you approve is what goes live.</p>
            <p className="mono mute">Designing since 2018 · 97 projects · 5.0 from 71 reviews</p>
          </div>
          <div className="hu-br"><Link className="btn" href="/contact" data-cursor="link">Get in touch<Arrow /></Link></div>
        </div>
        <div className="chs-scrim" aria-hidden="true" />
        <div className="chs" aria-hidden="true">
          {CHAPTERS.map(([a, b], i) => (
            <p className={`chp chp-${i + 1}`} key={a}><span className="mono">{a}</span>{b}</p>
          ))}
        </div>
        <div className="hud" aria-hidden="true">
          <p className="hud-deg num"><span className="hud-num" />°</p>
          <p className="hud-lbl mono"><span className="hud-cue">Scroll to go through the slash</span><span className="hud-ph hud-ph-d">d · design</span><span className="hud-ph hud-ph-p">p · production</span></p>
        </div>
        {/* the tunnel fades to bone, so it hands straight over to the work list */}
        <div className="flash" aria-hidden="true" />
      </section>
    </div>
  );
}

