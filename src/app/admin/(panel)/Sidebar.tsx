'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mark } from '@/components/Mark';
import { logoutAction } from '../actions';

const ICONS = {
  dash: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  seo: 'M21 21l-5.2-5.2M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  posts: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  auto: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  site: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  out: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  side: 'M3 4h18v16H3zM9 4v16',
  menu: 'M4 7h16M4 12h16M4 17h16',
} as const;

const LINKS = [['/admin', 'Overview', 'dash'], ['/admin/posts', 'Posts', 'posts'], ['/admin/auto-post', 'Auto-post', 'auto'], ['/admin/seo', 'SEO', 'seo']] as const;

function Icon({ d }: { d: string }) {
  return <svg className="adm-ico" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false); // the drawer on small screens
  useEffect(() => setOpen(false), [path]);

  const toggle = () => {
    const shell = document.querySelector('.adm-shell');
    const next = !shell?.hasAttribute('data-collapsed');
    shell?.toggleAttribute('data-collapsed', next);
    document.cookie = `dp_side=${next ? 1 : 0}; path=/admin; max-age=31536000; samesite=lax`;
  };

  return (
    <>
      <header className="adm-top">
        <button className="adm-ib" onClick={() => setOpen(true)} aria-label="Open menu"><Icon d={ICONS.menu} /></button>
        <Link href="/admin" className="adm-logo"><Mark className="adm-mark" /><span>Denny Pratama</span></Link>
      </header>
      <div className="adm-scrim" data-open={open || undefined} onClick={() => setOpen(false)} />
      <nav className="adm-side" data-open={open || undefined} aria-label="Admin">
        <div className="adm-brand">
          <Link href="/admin" className="adm-logo" title="Denny Pratama · Admin">
            <Mark className="adm-mark" />
            <span><b>Denny Pratama</b><small>Admin</small></span>
          </Link>
        </div>
        <div className="adm-nav">
          {LINKS.map(([href, label, icon]) => {
            const on = href === '/admin' ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} title={label}>
                <Icon d={ICONS[icon]} /><span>{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="adm-nav adm-foot">
          <a href="/" target="_blank" rel="noopener" title="View site"><Icon d={ICONS.site} /><span>View site</span></a>
          <form action={logoutAction}><button title="Log out"><Icon d={ICONS.out} /><span>Log out</span></button></form>
          <button className="adm-collapse" onClick={toggle} title="Collapse sidebar" aria-label="Collapse or expand the sidebar"><Icon d={ICONS.side} /><span>Collapse</span></button>
        </div>
      </nav>
    </>
  );
}

