'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { onFrame, setVar, viewH } from '@/lib/frame';
import { WORK } from '@/lib/work';
import { Arrow } from '../Icons';
import { ShotMedia } from '../ShotMedia';
import { ConceptPoster, ConceptScene } from '../concept';
import { openCase } from '../CaseViewer';

/**
 * Names sit as outlines and wipe to ink along the 23.6° cut on hover. While a name is hovered, the project's full
 * frame follows the pointer, leaning into its own speed. With no hover, nothing is lit. On touch every row carries its
 * own frame and lights up as it crosses the middle of the screen. A project with a video plays it only while it is the
 * one on show. Rows skew slightly with scroll velocity.
 */
export function WorkIndex() {
  const sec = useRef<HTMLElement>(null);
  const pv = useRef<HTMLDivElement>(null);
  // Each project sits in the list twice: inline (touch and narrow screens) and in the floating preview (hover). CSS
  // hides one of them; only the one on show mounts its live concept, so the hidden copy costs no DOM or script.
  const [mode, setMode] = useState<'touch' | 'hover' | null>(null);
  useEffect(() => {
    const q = window.matchMedia('(hover: none), (max-width: 900px)');
    const set = () => setMode(q.matches ? 'touch' : 'hover');
    set();
    q.addEventListener('change', set);
    return () => q.removeEventListener('change', set);
  }, []);

  useEffect(() => {
    const work = sec.current;
    const box = pv.current;
    if (!work || !box) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // same query as the inline previews in home.css
    const touch = window.matchMedia('(hover: none), (max-width: 900px)');
    const inline = Array.from(work.querySelectorAll<HTMLElement>('.r-pv'));
    const floating = Array.from(box.querySelectorAll<HTMLElement>('.sm'));
    // --skew goes on the links themselves: on the section it would restyle every element inside it, every frame
    const links = Array.from(work.querySelectorAll<HTMLElement>('.row-a'));
    const s = { x: 0, y: 0, r: 0, init: false };
    // play only the frames on show; every other video stays paused and unloaded
    const play = (el: HTMLElement, on: boolean) => {
      const v = el.querySelector('video');
      if (!v || reduce) return;
      if (on && v.paused) v.play().catch(() => {});
      else if (!on && !v.paused) v.pause();
    };
    const m = { cx: 0, cy: 0 };
    let hover = false;
    let skew = 0;
    let lastY = window.scrollY;

    const move = (e: PointerEvent) => { m.cx = e.clientX; m.cy = e.clientY; hover = !!(e.target as Element)?.closest?.('.idx'); };
    const leave = () => { hover = false; };
    work.addEventListener('pointermove', move);
    work.addEventListener('pointerleave', leave);
    // buffer the loops as the list comes near, so a hover never waits on the network; only the copy CSS shows
    // (a hidden twin would fetch the same file again), and not at all when the visitor asked to save data
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    const near = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting || reduce || saveData) return;
      near.disconnect();
      work.querySelectorAll('video').forEach((v) => {
        if (!v.getClientRects().length) return;
        v.preload = 'auto';
        v.load();
      });
    }, { rootMargin: '600px 0px' });
    near.observe(work);

    // measured in the frame's reading half, applied in its writing half (see lib/frame)
    let wr: DOMRect | null = null;
    let away = true;
    let y = lastY;
    let rects: DOMRect[] = [];
    let bw = 0;
    let row: HTMLElement | null = null;
    let key = false;
    let rowMid = 0;
    const read = () => {
      wr = work.getBoundingClientRect();
      away = wr.bottom < -200 || wr.top > viewH() + 200;
      y = window.scrollY;
      if (away) return;
      if (touch.matches) { rects = inline.map((el) => el.getBoundingClientRect()); return; }
      // a row reached with the keyboard gets the same preview as a hovered one, parked right of centre on the row
      key = !hover && !!work.querySelector('.row-a:focus-visible');
      if (!hover && !key) return;
      bw = box.offsetWidth;
      row = work.querySelector(hover ? '.row-a:hover' : '.row-a:focus-visible')?.parentElement as HTMLElement | null;
      if (row) rowMid = row.offsetTop + row.offsetHeight / 2;
    };

    const write = () => {
      if (!wr || away) { lastY = y; return; }
      if (!reduce) {
        const v = y - lastY;
        lastY = y;
        skew += (Math.max(-4, Math.min(4, v * 0.05)) - skew) * 0.12;
        const k = skew.toFixed(3);
        links.forEach((l) => setVar(l, '--skew', k));
      }

      if (touch.matches) {
        // the row whose frame is within ±20% of the screen's centre is the one on show
        const vh = viewH();
        inline.forEach((el, i) => {
          const r = rects[i];
          if (!r) return;
          const on = Math.abs(r.top + r.height / 2 - vh / 2) < vh * 0.2;
          // the row on show lights up, the touch stand-in for hover
          el.parentElement?.classList.toggle('is-on', on);
          play(el, on);
        });
        return;
      }

      let tx: number;
      let ty: number;
      if (hover || (key && row)) {
        const half = bw / 2 + 24;
        tx = hover ? Math.min(wr.width - half, Math.max(half, m.cx - wr.left + bw / 2 + 48)) : Math.min(wr.width - half, wr.width * 0.6);
        ty = row ? rowMid : m.cy - wr.top;
        const k = row ? Array.from(row.parentElement!.children).indexOf(row) : -1;
        floating.forEach((el, i) => play(el, i === k));
      } else {
        floating.forEach((el) => play(el, false));
        // the preview only shows on hover; it starts from the pointer next time
        s.init = false;
        return;
      }
      if (!s.init || reduce) { s.x = tx; s.y = ty; s.init = true; }
      const ox = s.x;
      s.x += (tx - s.x) * 0.14;
      s.y += (ty - s.y) * 0.14;
      s.r += (Math.max(-16, Math.min(16, (s.x - ox) * 0.5)) - s.r) * 0.12;
      box.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${s.r.toFixed(2)}deg)`;
    };
    const stop = onFrame(read, write);
    return () => {
      stop();
      work.removeEventListener('pointermove', move);
      work.removeEventListener('pointerleave', leave);
      near.disconnect();
    };
  }, []);

  return (
    <section className="work on-bone" id="work" aria-labelledby="work-h" ref={sec}>
      <div className="wrap">
        <div className="work-top grid">
          <h2 className="h-xl gc-1-8" id="work-h">Drawn, then shipped.</h2>
          <p className="lead gc-9-12">My studio, three concepts I invented to show motion, and Morrow, the one I turned into a real tool. The client work lives on the work page. Point at a name to see it.</p>
        </div>
      </div>
      <ul className="idx">
        {WORK.map((w, i) => {
          const inner = (
            <>
              <span className="r-n mono">0{i + 1}</span>
              <span className="r-name"><span className="rn-o">{w.name}</span><span className="rn-s" aria-hidden="true">{w.name}</span></span>
              {w.scene
                ? <span className="sm r-pv" aria-hidden="true">{mode === 'touch' ? <ConceptScene k={w.k} active="auto" /> : <ConceptPoster k={w.k} />}</span>
                : <ShotMedia className="r-pv" img={w.img} video={w.video} sizes="(max-width: 900px) 100vw, 60vw" />}
              <span className="r-meta"><span className="mono">{w.cat}</span><span className="r-d">{w.short}</span><span className="r-go mono">{w.concept ? w.go : 'Open the preview'}<Arrow /></span></span>
            </>
          );
          return (
            <li className={`row r${i}`} key={w.k}>
              <button type="button" className="row-a" onClick={() => openCase(w.k)} data-cursor="view">{inner}</button>
            </li>
          );
        })}
      </ul>
      <div className="work-all">
        <p className="mono">Nine client projects on the work page</p>
        <Link className="lnk mono" href="/work" data-cursor="link">See all work<Arrow /></Link>
      </div>
      <div className="pv" ref={pv} aria-hidden="true">
        {WORK.map((w, i) => w.scene
          ? <span key={w.k} className={`sm i${i}`}>{mode === 'hover' ? <ConceptScene k={w.k} active="auto" /> : <ConceptPoster k={w.k} />}</span>
          : <ShotMedia key={w.k} className={`i${i}`} img={w.img} video={w.video} sizes="560px" />)}
      </div>
    </section>
  );
}

