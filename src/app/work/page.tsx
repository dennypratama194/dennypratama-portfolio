import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_WORK, CLIENT, CONCEPTS, FILTERS, MORE, countFor } from '@/lib/work';
import { PageHead, SecHead } from '@/components/PageParts';
import { Chips, FilterScope, Filtered } from '@/components/pages/Filter';
import { ContactFooter } from '@/components/ContactFooter';
import { BrowserShot } from '@/components/BrowserShot';
import { MockDrive } from '@/components/MockDrive';
import { CaseOpen } from '@/components/CaseViewer';
import { ConceptScene } from '@/components/concept';
import { Arrow } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Nine client products I designed, plus this site and products of my own that I designed and built. SaaS, enterprise, agency and content work.',
  alternates: { canonical: '/work' },
};

// the address bar shows a real domain only where one is known; otherwise just the product's name
const urlFor = (w: { ext: boolean; go: string; name: string; k: string }) => (w.ext ? w.go : w.k === 'wordsburg' ? 'wordsburg.com' : w.name);

export default function WorkPage() {
  const total = String(ALL_WORK.length).padStart(2, '0');
  return (
    <FilterScope>
      <main>
        <PageHead
          title="Work"
          sup={total}
          lead="Nine client products I designed. Four in depth, five more below, then four products of my own made to show motion. One of them, Morrow, is now a live tool."
          right={<Chips label="Filter work" items={FILTERS.map((f) => ({ key: f.key, label: f.label, count: countFor(f.key) }))} />}
        />
        <section className="wk on-bone" aria-labelledby="wk-h">
          <div className="wrap">
            <SecHead n="01" label="Selected" id="wk-h" right="Live sites" />
            {/* case 00 is the site itself; it sits above the filters because it is every category at once */}
            <article className="wkf grid">
              <Link className="wkf-s" href="/work/dennypratama" data-cursor="view" aria-label="This site">
                <BrowserShot img="/img/work-dennypratama.jpg" url="dennypratama.com" alt="The home page of this site" sizes="(max-width: 900px) 100vw, 66vw" drive="rise" />
              </Link>
              <div className="wkf-t">
                <p className="wkf-n mono"><span>00 / {total}</span><span>Case study</span></p>
                <h2 className="wkf-h">This site</h2>
                <p className="lead">The portfolio you are on: one mark, one angle, a raymarched tunnel and no 3D engine. How it was drawn, then built.</p>
                <div className="tags">{['Identity', 'WebGL2', 'Next.js', 'GSAP'].map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                <p><Link className="lnk mono" href="/work/dennypratama" data-cursor="link">Read the case<Arrow /></Link></p>
              </div>
            </article>
            {CLIENT.map((w, i) => {
              const ext = w.ext ? { target: '_blank', rel: 'noopener' } : {};
              const L = w.ext ? 'a' : Link;
              return (
                <Filtered k={w.fil} key={w.k}>
                  <article className="wkf grid">
                    <L className="wkf-s" href={w.href} {...ext} data-cursor="view" aria-label={w.name}>
                      <BrowserShot img={w.img} url={urlFor(w)} video={w.video} alt={`${w.name} home page`} sizes="(max-width: 900px) 100vw, 66vw" drive="rise" />
                    </L>
                    <div className="wkf-t">
                      <p className="wkf-n mono"><span>0{i + 1} / {total}</span><span>{w.cat}</span></p>
                      <h2 className="wkf-h">{w.name}</h2>
                      <p className="lead">{w.desc}</p>
                      <div className="tags">{w.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                      <p><L className="lnk mono" href={w.href} {...ext} data-cursor="link">{w.go}<Arrow /></L></p>
                    </div>
                  </article>
                </Filtered>
              );
            })}
          </div>
        </section>
        <section className="wkc" aria-labelledby="wkc-h">
          <div className="wrap">
            <SecHead n="02" label="Self-initiated" id="wkc-h" right="Not client work" />
            <div className="sec-top grid">
              <h2 className="t-d2 gc-1-8">Invented products, built to move.</h2>
              <p className="lead mute gc-9-12">No client, no brief. Each one is a product I made up to try one kind of motion: an orbit of integrations, a live graph, a globe, a flow field. Open one to scroll through it. Morrow grew into a real tool you can use.</p>
            </div>
            <div className="wkc-g">
              {CONCEPTS.map((w) => (
                <article className="wkc-c" key={w.k}>
                  <CaseOpen k={w.k} className="wkf-s" label={w.concept ? `Open ${w.name}, a concept` : `Open ${w.name}`}><span className="fl-shot"><ConceptScene k={w.k} active="auto" /></span></CaseOpen>
                  <div className="wkm-r"><h3>{w.name}</h3><span className="mono mute">{w.concept ? 'Concept' : 'Built by me'}</span></div>
                  <p className="mono">{w.cat.replace(/^(Concept|Built by me) · /, '')}</p>
                  <p>{w.concept
                    ? <CaseOpen k={w.k} className="lnk mono">{w.go}<Arrow /></CaseOpen>
                    : <a className="lnk mono" href={w.href} target="_blank" rel="noopener" data-cursor="link">{w.go}<Arrow /></a>}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="wkm" aria-labelledby="wkm-h">
          <div className="wrap">
            <SecHead n="03" label="More work" id="wkm-h" />
            <div className="sec-top grid">
              <h2 className="t-d2 gc-1-8">Smaller projects, same standard.</h2>
              <p className="lead mute gc-9-12">Marketing sites and product pages for fintech, health and agency clients.</p>
            </div>
            <div className="wkm-g">
              {MORE.map((w, i) => (
                <Filtered k={w.fil} key={w.k}>
                  <article className="wkm-c">
                    <BrowserShot img={w.img} url={urlFor(w)} alt={`${w.name} home page`} sizes="(max-width: 900px) 100vw, 50vw" drive="rise" />
                    <div className="wkm-r"><h3>{w.name}</h3><span className="mono mute">0{i + 5} / {total}</span></div>
                    <p className="mono">{w.cat}</p>
                    <p>{w.desc}</p>
                  </article>
                </Filtered>
              ))}
            </div>
          </div>
        </section>
      </main>
      <ContactFooter />
      <MockDrive />
    </FilterScope>
  );
}

