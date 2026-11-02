'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type SiteCtx = {
  menu: boolean;
  setMenu: (open: boolean) => void;
  flag: (name: string, on: boolean) => void;
};

const Ctx = createContext<SiteCtx>({ menu: false, setMenu: () => {}, flag: () => {} });
export const useSite = () => useContext(Ctx);

/** Sets a class on the .site root while the calling component wants it (has-intro, gl-fail, gl-on). */
export function useRootFlag(name: string, on: boolean) {
  const { flag } = useSite();
  useEffect(() => {
    flag(name, on);
    return () => flag(name, false);
  }, [flag, name, on]);
}

// The intro plays once per visit: the first home render, never again after a client-side navigation. A visitor who
// saw it in the last day skips it (layout.tsx marks <html> with intro-seen before first paint).
let introPlayed = false;
const markSeen = () => { try { localStorage.setItem('dp-intro', String(Date.now())); } catch { /* private mode */ } };

export function Site({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [flags, setFlags] = useState<string[]>(() => (path === '/' && !introPlayed ? ['has-intro'] : []));

  const flag = useCallback((name: string, on: boolean) => {
    setFlags((f) => (on ? (f.includes(name) ? f : [...f, name]) : f.filter((x) => x !== name)));
  }, []);

  useEffect(() => setMenu(false), [path]);

  // Start after a painted frame. The tunnel compiles independently while the intro plays.
  const go = flags.includes('ld-go');
  useEffect(() => {
    let a = 0;
    let b = 0;
    a = requestAnimationFrame(() => { b = requestAnimationFrame(() => flag('ld-go', true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [flag]);

  useEffect(() => {
    if (!go || !flags.includes('has-intro')) return;
    const seen = document.documentElement.classList.contains('intro-seen');
    const t = setTimeout(() => {
      introPlayed = true;
      if (!seen) markSeen();
      flag('has-intro', false);
    }, seen ? 1500 : 4500);
    return () => clearTimeout(t);
  }, [go, flags, flag]);

  useEffect(() => {
    if (path !== '/') introPlayed = true;
  }, [path]);

  const value = useMemo(() => ({ menu, setMenu, flag }), [menu, flag]);
  const cls = ['site', 'has-grain', ...flags, menu ? 'menu-open' : ''].filter(Boolean).join(' ');

  return (
    <Ctx.Provider value={value}>
      <div className={cls} id="top">
        {children}
        <div className="grain" aria-hidden="true" />
      </div>
    </Ctx.Provider>
  );
}

