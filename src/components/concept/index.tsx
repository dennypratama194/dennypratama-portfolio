'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Live } from './live';

type P = { active: Live; full?: boolean };
// each scene is its own chunk, fetched on the client only, so the home page's first load carries none of them;
// until it arrives the frame holds the scene's ground colour
const BG: Record<string, string> = { revo: '#FFFFFF', halden: '#F7F6FB', noctua: '#0D0C0A', morrow: '#EEEAE1', fieldline: '#0A0D10' };
const poster = (k: string) => function Ground() { return <span className="cx-poster" style={{ background: BG[k] }} />; };
const scene = (k: string, load: () => Promise<React.ComponentType<P>>) => dynamic(load, { ssr: false, loading: poster(k) });

/** Every concept, by its key in WORK, with the line the case viewer shows under it. */
export const SCENES: Record<string, { C: React.ComponentType<P>; hint: string }> = {
  halden: { C: scene('halden', () => import('./HaldenScene').then((m) => m.HaldenScene)), hint: 'Scroll inside the frame · move to tilt the orbit' },
  noctua: { C: scene('noctua', () => import('./NoctuaScene').then((m) => m.NoctuaScene)), hint: 'Scroll inside the frame · push the graph aside' },
  morrow: { C: scene('morrow', () => import('./MorrowScene').then((m) => m.MorrowScene)), hint: 'Scroll inside the frame · turn the globe' },
  fieldline: { C: scene('fieldline', () => import('./FieldlineScene').then((m) => m.FieldlineScene)), hint: 'Scroll inside the frame · move across the wind' },
};

/** The ground a concept sits on, without the scene: what a hidden copy of a frame shows. */
export function ConceptPoster({ k }: { k: string }) {
  return BG[k] ? <span className="cx-poster" style={{ background: BG[k] }} /> : null;
}

/** A concept, live; renders nothing for a key that has no scene. */
export function ConceptScene({ k, active, full }: { k: string } & P) {
  const ground = useRef<HTMLSpanElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !active) return;
    // The open viewer needs its scene immediately. Previews can load just before they reach the screen.
    if (full) { setNear(true); return; }
    const el = ground.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      setNear(true);
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [active, full, near]);
  const s = SCENES[k];
  return s ? near ? <s.C active={active} full={full} /> : <span ref={ground} className="cx-poster" style={{ background: BG[k] }} /> : null;
}

