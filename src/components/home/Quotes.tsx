'use client';

import { Fragment, useEffect, useRef } from 'react';
import { onFrame, setVar, viewH } from '@/lib/frame';
import { lenis } from '../SmoothScroll';

// pull: a phrase lifted word for word from the quote, set large. Never write one the client didn't say.
// res: a result only where it adds something the quote doesn't already say.
const QUOTES: { pull: string; q: string; who: string; res?: string }[] = [
  { pull: 'Motion example.', q: 'This is placeholder copy showing the animated testimonial layout. It is not a client endorsement.', who: 'Demo content' },
  { pull: 'Readable without motion.', q: 'The source includes a reduced-motion path. Replace this example with a review you have permission to publish.', who: 'Demo content' },
  { pull: 'Make it your own.', q: 'Use your own branding, project images, and verified results before deploying a fork.', who: 'Demo content' },
];
const N = QUOTES.length;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const words = (s: string) => s.split(' ');

/**
 * One client at a time, pinned. Each phrase rises in word by word, then the full quote lights up as it is read, and
 * the next client cuts in over it along the slash. The rail below shows where you are and jumps to a quote.
 * Reduced motion unpins it and shows all three, still.
 */
export function Quotes() {
  const pin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pin.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>('.qv'));
    const bars = Array.from(el.querySelectorAll<HTMLElement>('.qs-rail button'));
    let r: DOMRect | null = null;
    const read = () => { r = el.getBoundingClientRect(); };
    const write = () => {
      const vh = viewH();
      const b = r;
      if (!b || b.bottom < 0 || b.top > vh) return;
      const seg = clamp(-b.top / (b.height - vh)) * N;
      slides.forEach((s, i) => {
        const local = seg - i;
        // the first one arrives with the section; the rest cut in across the boundary with the one before
        const cut = i === 0 ? clamp(1 - b.top / (vh * 0.8)) : clamp((local + 0.12) / 0.24);
        setVar(s, '--in', cut.toFixed(4));
        setVar(s, '--qr', clamp((local - 0.08) / 0.68).toFixed(4));
        setVar(bars[i], '--qb', clamp(local).toFixed(4));
        bars[i].classList.toggle('on', local >= -0.12 && (i === N - 1 || local < 0.88));
      });
    };
    return onFrame(read, write);
  }, []);

  const go = (i: number) => {
    const el = pin.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = top + ((i + 0.45) / N) * (el.offsetHeight - window.innerHeight);
    const l = lenis();
    if (l) l.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div className="qs-pin" ref={pin}>
      <div className="qs-stage wrap">
        <div className="qs-deck">
          {QUOTES.map((x, i) => (
            <figure className="qv" key={x.who} style={{ zIndex: i + 1 }}>
              <p className="qv-p" aria-hidden="true">
                <span className="qv-mk">“</span>
                {words(x.pull).map((w, j) => <Fragment key={j}><span className="qv-w"><span style={{ '--qi': j } as React.CSSProperties}>{w}</span></span>{' '}</Fragment>)}
              </p>
              <div className="qv-r">
                <blockquote className="qv-q" style={{ '--qn': words(x.q).length } as React.CSSProperties}>
                  <p>{words(x.q).map((w, j) => <span key={j} style={{ '--qi': j } as React.CSSProperties}>{w} </span>)}</p>
                </blockquote>
                <figcaption className="qv-cap">
                  <span className="qv-av" aria-hidden="true">{x.who[0]}</span>
                  <span><b>{x.who}</b>{x.res && <span className="mono mute">{x.res}</span>}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
        <div className="qs-rail" aria-label="Jump to a quote">
          {QUOTES.map((x, i) => (
            <button type="button" key={x.who} onClick={() => go(i)} data-cursor="link">
              <span className="mono">0{i + 1} / 0{N}</span><span>{x.who}</span><i />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

