'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { rescanFx } from '../ScrollFx';
import { Cover } from '../Cover';
import { HoverPreview } from './HoverPreview';
import { useFilter } from './Filter';

export type Row = { slug: string; title: string; category: string; cat: string; date: string; minutes: number; coverKind: number; n: number };

const STEP = 10;

/** The post index: filtered by the chips first, then shown ten rows at a time. */
export function BlogList({ rows }: { rows: Row[] }) {
  const cur = useFilter();
  const [shown, setShown] = useState(STEP);
  const [hot, setHot] = useState<string | null>(null);
  const list = rows.filter((r) => cur === 'all' || r.cat === cur);
  const vis = list.slice(0, shown);
  const left = list.length - vis.length;

  // rows mount after ScrollFx's first pass, so have it pick up the new ones
  useEffect(() => { rescanFx(); }, [shown, cur]);

  const more = () => setShown((s) => s + STEP);

  return (
    <HoverPreview className="bl" aria-label="All posts">
      <div className="wrap">
        <ul className="bl-l" onPointerLeave={() => setHot(null)}>
          {vis.map((p) => (
            <li className="bl-r" key={p.slug}>
              <Link className="bl-a sx" style={{ '--to': p.n } as React.CSSProperties} href={`/blog/${p.slug}`} data-cursor="view" onPointerEnter={() => setHot(p.slug)}>
                <span className="sx-v" aria-hidden="true">
                  <span className="sx-o"><i className="sx-n" /></span>
                  <span className="sx-s"><i className="sx-n" /></span>
                </span>
                <span className="bl-t">
                  <span className="bl-h"><span>{p.title}</span></span>
                  <span className="bl-m mono">
                    <span className="bl-k">{p.category}</span>
                    <span>{p.date}</span>
                    <span className="bl-x">{p.minutes} min</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {left > 0 && (
          <button className="btn bl-more" type="button" onClick={more} data-cursor="link">
            Show more<b className="mono">{String(left).padStart(2, '0')}</b>
          </button>
        )}
      </div>
      <div className="hpv" aria-hidden="true">
        <div className="hpv-in">
          {vis.map((p) => <Cover key={p.slug} className={hot === p.slug ? 'on' : ''} n={p.n} kind={p.coverKind} label={p.category} bone={p.n % 2 === 1} />)}
        </div>
      </div>
    </HoverPreview>
  );
}

