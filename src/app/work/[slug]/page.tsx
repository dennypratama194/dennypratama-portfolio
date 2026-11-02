import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CASES, getCase } from '@/lib/cases';
import { SecHead, Shot } from '@/components/PageParts';
import { ContactFooter } from '@/components/ContactFooter';
import { Code } from '@/components/Code';
import { Arrow } from '@/components/Icons';
import { BrowserShot } from '@/components/BrowserShot';

export const dynamicParams = false;
export const generateStaticParams = () => CASES.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCase((await params).slug);
  if (!c) return {};
  return { title: `${c.name} case study`, description: c.intro, alternates: { canonical: `/work/${c.slug}` }, openGraph: { images: [c.cover] } };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  if (!c) notFound();
  const li = (L: string[], p: string) => L.map((t, i) => <li key={t}><span className="mono">{p}.{i + 1}</span><span>{t}</span></li>);
  return (
    <>
      <main>
        <section className="cs-h wrap" aria-labelledby="ph-h">
          <div className="cs-t">
            <h1 className="t-giga" id="ph-h">{c.name}</h1>
            <a className="btn btn-line" href={c.site} target="_blank" rel="noopener" data-cursor="link">Visit {c.siteLabel}<Arrow /></a>
          </div>
          <div className="cs-row grid">
            <p className="lead gc-1-6">{c.intro}</p>
            <div className="gc-7-12">
              <dl className="meta">
                {c.meta.flatMap(([k, v]) => (v ? [<div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>] : []))}
              </dl>
            </div>
          </div>
          <div className="cs-cover"><BrowserShot img={c.cover} url={c.siteLabel} alt={`${c.name} home page`} sizes="(max-width: 1680px) 100vw, 1584px" priority /></div>
        </section>

        <section className="cs-b on-bone" aria-labelledby="b1">
          <div className="wrap">
            <SecHead n="01" label="Brief" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-9" id="b1">{c.briefTitle}</h2></div>
            <div className="cs-txt grid">
              <p className="gc-1-6">{c.briefText}</p>
              {c.briefMore && <p className="gc-7-12">{c.briefMore}</p>}
            </div>
            <div className="cs-svc">
              <div className="svc">
                <div className="svc-c svc-d"><h3><span>Design</span><span className="mono">d · {String(c.design.length).padStart(2, '0')}</span></h3><ul>{li(c.design, 'd')}</ul></div>
                <div className="svc-c svc-p"><h3><span>Production</span><span className="mono">p · {String(c.production.length).padStart(2, '0')}</span></h3><ul>{li(c.production, 'p')}</ul></div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap" aria-label="Screens">
          <div className="cs-gal">
            {c.gallery.map((g) => (
              <figure className={g.cls} key={g.img}>
                <Shot src={g.img} alt={g.cap} pos={g.pos} sizes={g.cls === 'g-b' ? '(max-width: 900px) 280px, 33vw' : '(max-width: 900px) 100vw, 66vw'} />
                <figcaption className="mono"><b>{g.n}</b><span>{g.cap}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cs-dt on-bone" aria-labelledby="b3">
          <div className="wrap">
            <SecHead n="03" label="Detail" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b3">{c.detail.title}</h2><p className="lead gc-9-12">{c.detail.text}</p></div>
            <div className="cs-dt-g grid">
              <div className="gc-1-5"><div className="frame"><Image src={c.detail.img} alt={c.detail.alt} fill sizes="(max-width: 900px) 100vw, 33vw" /></div></div>
              <div className="gc-6-12"><Code src={c.detail.code} /><p className="mono mute">{c.detail.note}</p></div>
            </div>
          </div>
        </section>

        {c.outcomes && <section className="cs-out" aria-labelledby="b4">
          <div className="wrap">
            <SecHead n="04" label="Outcome" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b4">What changed.</h2></div>
            <ul className="out">{c.outcomes.map(([v, l]) => <li key={l}><b>{v}</b><span className="mono mute">{l}</span></li>)}</ul>
          </div>
        </section>}

        <Link className="nx on-bone" href={c.next.href} data-cursor="view" aria-label={`Next case, ${c.next.name}`}>
          <div className="wrap">
            <SecHead n={c.outcomes ? '05' : '04'} label="Next case" right={c.next.label} />
            <div className="nx-in" style={{ marginTop: 'var(--blk)' }}>
              <div className="nx-t"><span className="t-mega">{c.next.name}</span><span className="lnk mono" style={{ alignSelf: 'flex-start' }}>See the case<Arrow /></span></div>
              <BrowserShot img={c.next.img} url={c.next.href === '/work/dennypratama' ? 'dennypratama.com' : c.next.name} sizes="448px" />
            </div>
          </div>
        </Link>
      </main>
      <ContactFooter />
    </>
  );
}

