'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AVAILABILITY, EMAIL, NAV, SOCIAL } from '@/lib/site';
import { Arrow, Up } from './Icons';
import { Clock } from './Clock';

const EXPLORE = [{ label: 'Home', href: '/' }, ...NAV.filter((n) => n.key !== 'contact')];

/** The same finale on every page. Letters of the email swell in width and weight near the pointer. */
export function ContactFooter({ label = 'Contact' }: { label?: string }) {
  const path = usePathname();
  const mail = useRef<HTMLAnchorElement>(null);
  const foot = useRef<HTMLElement>(null);
  const gx = useRef({ to: 0.5, at: 0.5 });

  // The glow drifts toward the pointer.
  useEffect(() => {
    const f = foot.current;
    if (!f || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const tick = () => {
      const g = gx.current;
      g.at += (g.to - g.at) * 0.06;
      f.style.setProperty('--gx', `${(g.at * 100).toFixed(2)}%`);
      raf = Math.abs(g.to - g.at) < 0.001 ? 0 : requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      gx.current.to = e.clientX / window.innerWidth;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !mail.current) return;
    // every letter measured before any is written: --f changes their widths, so interleaving lays the line out per letter
    const ls = Array.from(mail.current.querySelectorAll<HTMLElement>('.ct-l'));
    const mids = ls.map((l) => { const r = l.getBoundingClientRect(); return r.left + r.width / 2; });
    ls.forEach((l, i) => l.style.setProperty('--f', Math.max(0, 1 - Math.abs(e.clientX - mids[i]) / 220).toFixed(3)));
  };
  const onLeave = () => mail.current?.querySelectorAll<HTMLElement>('.ct-l').forEach((l) => l.style.setProperty('--f', '0'));

  return (
    <footer className="ct" id="contact" aria-labelledby="contact-h" ref={foot}>
      <div className="ct-glow" aria-hidden="true" />
      <div className="ct-top wrap">
        {label && <p className="mono">{label}</p>}
        <p className="mono av"><i />{AVAILABILITY}</p>
        <p className="mono ct-time">Indonesia · <Clock /> GMT+7</p>
      </div>
      <h2 className="ct-h wrap" id="contact-h">
        <span className="ct-h1">Something</span>
        <span className="ct-h2">worth building?</span>
      </h2>
      <div className="wrap">
        <a className="ct-mail" ref={mail} href={`mailto:${EMAIL}`} data-cursor="link" aria-label={`Email ${EMAIL}`} onPointerMove={onMove} onPointerLeave={onLeave}>
          <span className="ct-ls" aria-hidden="true">
            {[...EMAIL].map((c, i) => <span className="ct-l" key={i}>{c}</span>)}
          </span>
        </a>
      </div>
      <div className="ct-cols wrap">
        <nav className="ct-col" aria-label="Explore">
          <p className="mono mute">Explore</p>
          <ul>
            {EXPLORE.map((n) => <li key={n.href}><a href={n.href} data-cursor="link">{n.label}</a></li>)}
          </ul>
        </nav>
        <div className="ct-col">
          <p className="mono mute">Connect</p>
          <ul>
            {SOCIAL.map((s) => <li key={s.name}><a href={s.href} target="_blank" rel="noopener" data-cursor="link">{s.name}</a></li>)}
          </ul>
        </div>
        <div className="ct-col">
          <p className="mono mute">Contact</p>
          <ul>
            <li><a href={`mailto:${EMAIL}`} data-cursor="link">{EMAIL}</a></li>
            <li className="ct-addr">Indonesia<br />Working worldwide, GMT+7</li>
          </ul>
        </div>
        <Link className="btn ct-btn" href={path === '/contact' ? '#top' : '/contact'} data-cursor="link">
          Get in touch
          <Arrow />
        </Link>
      </div>
      <div className="ct-bot wrap">
        <p className="mono mute">© 2026 Denny Pratama · Designed and built by the same hands</p>
        <a className="mono ct-up" href="#top" data-cursor="link">
          Back to top
          <Up />
        </a>
      </div>
    </footer>
  );
}

