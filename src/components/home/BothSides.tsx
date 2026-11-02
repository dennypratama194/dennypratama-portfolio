'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { Arrow } from '../Icons';
import { Mark } from '../Mark';
import { slashAt } from '@/lib/slash';

const DLIST = [['d.1', 'UI/UX design'], ['d.2', 'Design systems'], ['d.3', 'Brand identity'], ['d.4', 'Prototyping'], ['d.5', 'Motion']];
const PLIST = [['p.1', 'Next.js and React'], ['p.2', 'Design systems in code'], ['p.3', 'GSAP and WebGL'], ['p.4', 'AI features'], ['p.5', 'Performance and launch']];

// boxes measured on the 1440 × 900 home page of this site (scripts/shoot-home.mjs prints them when it reshoots the frame), as % of the frame: [left, top, width, height]
const HEAD = [3.3, 28, 24.7, 8];
const CTA = [85.5, 90.2, 11.2, 6.2];
const box = ([l, t, w, h]: number[]) => ({ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` });

/**
 * A blueprint on one side of the slash, the live site on the other. The frame pins while scroll sweeps the live site
 * in from the top left; the pointer scrubs it. The blueprint is traced from the same screenshot and says so, never
 * passing for a design file.
 */
const HEAD_T = 'One project. Both sides of the line.';
const LEAD_T = 'This site’s home page as a blueprint and as it ships. Scroll, and the live page sweeps in across the slash. Or move across the frame to scrub it. The blueprint is traced from the live page, so every line lands where it ships.';

export function BothSides() {
  const bs = useRef<HTMLDivElement>(null);

  const scrub = (e: React.PointerEvent) => {
    const el = bs.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sp', slashAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height).toFixed(4));
  };

  return (
    <section className="both" id="both" aria-labelledby="both-h">
      <div className="wrap">
        <div className="both-top grid">
          <h2 className="h-xl gc-1-8" id="both-h">{HEAD_T}</h2>
          <p className="lead gc-9-12">{LEAD_T}</p>
        </div>
      </div>
      <div className="bs-pin">
        <div className="bs-stage wrap">
          {/* phones: the heading rides in the pinned stage, so the frame never sits alone in a black screen */}
          <div className="bs-cap" aria-hidden="true"><p className="h-xl">{HEAD_T}</p><p className="lead">{LEAD_T}</p></div>
          <div className="bs" ref={bs} data-cursor="scrub" data-cl="Scrub" onPointerMove={scrub} role="img" aria-label="The home page of this site, half as a blueprint traced from it with its layout grid and half as the live site, split by a diagonal line">
            <div className="bs-prod">
              <Image src="/img/work-dennypratama.jpg" alt="" fill sizes="(max-width: 1680px) 100vw, 1584px" />
            </div>
            <div className="bs-des">
              <Image className="bs-draw" src="/img/draw-dennypratama.webp" alt="" fill sizes="(max-width: 1680px) 100vw, 1584px" />
              <div className="wf-cols" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>
              <div className="wf-sel" style={box(HEAD)}><i /><i /><i /><i /><span className="wf-pill">Display · 356 × 72</span></div>
              <div className="wf-sel wf-sel-s" style={box(CTA)}><i /><i /><i /><i /></div>
              <div className="wf-rl" style={{ left: '91%', top: '64%', height: '26.2%' }}><b>236</b></div>
            </div>
            <div className="bs-line" />
            <div className="bs-h"><Mark /></div>
          </div>
          <div className="bs-hud mono" aria-hidden="true">
            <span>d · design<small>Blueprint · traced from live · 1440</small></span>
            <span className="bs-bar"><i /></span>
            <span>p · production<small><i />Live · dennypratama.com</small></span>
          </div>
        </div>
      </div>
      <div className="wrap">
        <div className="both-foot">
          <div className="dp-col dp-d">
            <h3><span>Design</span><span className="mono">Before the build · 05</span></h3>
            <ul>{DLIST.map(([a, b]) => <li key={a}><span className="mono">{a}</span><span className="dp-t">{b}</span></li>)}</ul>
          </div>
          <div className="dp-col dp-p">
            <h3><span className="mono">05 · After the file</span><span>Production</span></h3>
            <ul>{PLIST.map(([a, b]) => <li key={a}><span className="mono">{a}</span><span className="dp-t">{b}</span></li>)}</ul>
          </div>
        </div>
        <p className="both-link"><Link className="lnk mono" href="/work/dennypratama" data-cursor="link">Read how this site was made<Arrow /></Link></p>
      </div>
    </section>
  );
}

