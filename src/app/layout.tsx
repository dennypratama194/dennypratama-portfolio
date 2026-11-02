import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import '@/styles/base.css';
import '@/styles/home.css';
import '@/styles/pages.css';
import '@/styles/concept.css';
import { INTRO_NOSCRIPT_CSS, INTRO_SEEN_SCRIPT } from '@/lib/intro';
import { SiteShell } from '@/components/SiteShell';
import { SITE_URL } from '@/lib/site';
import { JSON_LD } from '@/lib/structuredData';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Denny Pratama · Product designer who now builds what he designs', template: '%s · Denny Pratama' },
  description: 'Eight years designing SaaS products and dashboards, now building them too. I design it. I build it.',
  openGraph: { type: 'website', siteName: 'Denny Pratama', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

// who this site is about, for search engines and AI answers; keep it to what the pages themselves say


export const viewport: Viewport = { themeColor: '#0C0C0B', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SEEN_SCRIPT }} />
        <noscript><style dangerouslySetInnerHTML={{ __html: INTRO_NOSCRIPT_CSS }} /></noscript>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      </head>
      <body>
        <div role="note" style={{position:'fixed',bottom:12,left:12,zIndex:2147483647,padding:'8px 12px',background:'#171717',color:'#fff',fontSize:12,border:'1px solid #555',borderRadius:6}}>Source demo · placeholder artwork · configure your own services</div>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}

