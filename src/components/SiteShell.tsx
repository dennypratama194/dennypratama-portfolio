'use client';

import { usePathname } from 'next/navigation';
import { Site } from './Site';
import { Nav } from './Nav';
import { PhoneMenu } from './PhoneMenu';
import { Cursor } from './Cursor';
import { SmoothScroll } from './SmoothScroll';
import { ScrollFx } from './ScrollFx';
import { PageTransition } from './PageTransition';
import { CaseViewer } from './CaseViewer';
import { PerfHud } from './PerfHud';
import { Tracker } from './Tracker';

/** The site's chrome around every page, except the admin, which is a plain tool with none of it. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  if (usePathname().startsWith('/admin')) return children;
  return (
    <>
      <Site>
        <Cursor />
        <Nav />
        <PhoneMenu />
        {children}
        <PageTransition />
        <CaseViewer />
      </Site>
      <SmoothScroll />
      <ScrollFx />
      <PerfHud />
      {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' && <Tracker />}
    </>
  );
}

