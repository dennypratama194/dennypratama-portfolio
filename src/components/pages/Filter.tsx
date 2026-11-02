'use client';

import { createContext, useContext, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const Ctx = createContext<{ cur: string; set: (k: string) => void }>({ cur: 'all', set: () => {} });

/** Chips in the page head filter items further down the page. */
export function FilterScope({ children }: { children: React.ReactNode }) {
  const [cur, setCur] = useState('all');
  const set = (k: string) => {
    setCur(k);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  return <Ctx.Provider value={{ cur, set }}>{children}</Ctx.Provider>;
}

export function Chips({ items, label }: { items: { key: string; label: string; count: number }[]; label: string }) {
  const { cur, set } = useContext(Ctx);
  return (
    <div className="chips" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.key} type="button" className={`chip${cur === it.key ? ' on' : ''}`} aria-pressed={cur === it.key} onClick={() => set(it.key)} data-cursor="link">
          {it.label}
          <b>{String(it.count).padStart(2, '0')}</b>
        </button>
      ))}
    </div>
  );
}

export const useFilter = () => useContext(Ctx).cur;

/** Renders its child only when the active filter matches. */
export function Filtered({ k, children }: { k: string; children: React.ReactNode }) {
  const { cur } = useContext(Ctx);
  return cur === 'all' || cur === k ? <>{children}</> : null;
}

