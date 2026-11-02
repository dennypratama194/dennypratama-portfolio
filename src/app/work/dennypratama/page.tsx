import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SecHead } from '@/components/PageParts';
import { ContactFooter } from '@/components/ContactFooter';
import { Code } from '@/components/Code';
import { Arrow } from '@/components/Icons';
import { SlashShot } from '@/components/SlashShot';
import { BrowserShot } from '@/components/BrowserShot';
import { SlashDrive } from '@/components/SlashDrive';
import { Construction } from '@/components/home/Construction';
import { SITE_CASE } from '@/lib/siteCase';

export const metadata: Metadata = {
  title: 'This site, case study',
  description: SITE_CASE.intro,
  alternates: { canonical: '/work/dennypratama' },
  openGraph: { images: ['/img/work-dennypratama.jpg'] },
};

const { intro, meta, tunnel, slash, stack, perf } = SITE_CASE;

/** Case 00: the portfolio itself. The full construction, the shader and the slash system, with the numbers from the build. */
export default function SiteCase() {
  return (
    <>
      <main>
        <section className="cs-h wrap" aria-labelledby="ph-h">
          <div className="cs-t">
            <h1 className="t-giga" id="ph-h">This site</h1>
            <Link className="btn btn-line" href="/" data-cursor="link">Go through the slash<Arrow /></Link>
          </div>
          <div className="cs-row grid">
            <p className="lead gc-1-6">{intro}</p>
            <div className="gc-7-12">
              <dl className="meta">{meta.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>)}</dl>
            </div>
          </div>
          <div className="cs-cover"><SlashShot className="shot" img="/img/work-dennypratama.jpg" alt="The home page of this site, as a traced blueprint and live" sizes="(max-width: 1680px) 100vw, 1584px" priority drive="sweep" /></div>
        </section>

        <section className="cs-b on-bone" aria-labelledby="b1">
          <div className="wrap">
            <SecHead n="01" label="Brief" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-9" id="b1">One angle, both sides.</h2></div>
            <div className="cs-txt grid">
              <p className="gc-1-6">I design products and I build them, so the portfolio had to prove both in the same breath. The whole identity is one move: a d, turned 180°, becomes a p. Design turns into production without changing hands.</p>
              <p className="gc-7-12">Everything else follows from the slash between them. It sits at 23.6°, and that one number cuts every transition, mask and reveal on the site. If something moves, it moves along that line.</p>
            </div>
          </div>
        </section>

        <Construction full label="02 · The mark, constructed" />

        <section className="cs-dt" aria-labelledby="b3">
          <div className="wrap">
            <SecHead n="03" label="The tunnel" right="Raw WebGL2 · no three.js" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b3">A logo you can fly through.</h2><p className="lead gc-9-12">{tunnel.text}</p></div>
            <div className="cs-dt-g grid">
              <div className="gc-1-6 sc-pair">
                <figure><span className="shot"><Image src="/img/site-dive.jpg" alt="Inside the tunnel: the solid marks part around the slash" fill sizes="(max-width: 900px) 100vw, 40vw" /></span><figcaption className="mono"><b>Fig. 02</b><span>Diving between the solids</span></figcaption></figure>
                <figure><span className="shot"><Image src="/img/site-tunnel.jpg" alt="Deeper in: the mark as a blueprint, outlines and a graph grid" fill sizes="(max-width: 900px) 100vw, 40vw" /></span><figcaption className="mono"><b>Fig. 03</b><span>The blueprint marks, drawn without marching</span></figcaption></figure>
              </div>
              <div className="gc-7-12">
                <Code src={tunnel.code} />
                <ul className="sc-facts">{tunnel.facts.map(([v, l]) => <li key={l}><b>{v}</b><span>{l}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="cs-b on-bone" aria-labelledby="b4">
          <div className="wrap">
            <SecHead n="04" label="The slash system" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b4">One function cuts everything.</h2><p className="lead gc-9-12">{slash.text}</p></div>
            <div className="cs-dt-g grid">
              <div className="gc-1-7"><SlashShot className="shot sc-demo" img="/img/work-dennypratama.jpg" alt="This site's home page, as a traced blueprint and live, split by the slash" sizes="(max-width: 900px) 100vw, 50vw" drive="scroll" /><p className="mono mute">Move across it, or scroll: the slash follows</p></div>
              <div className="gc-8-12"><Code src={slash.code} /><ul className="sc-uses">{slash.uses.map((u) => <li key={u}>{u}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="cs-b" aria-labelledby="b5">
          <div className="wrap">
            <SecHead n="05" label="Stack" />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b5">One clock, no engine.</h2></div>
            <ul className="sc-stack">{stack.map(([k, v]) => <li key={k}><span className="mono">{k}</span><p>{v}</p></li>)}</ul>
          </div>
        </section>

        <section className="cs-out" aria-labelledby="b6">
          <div className="wrap">
            <SecHead n="06" label="Performance" right={perf.how} />
            <div className="sec-top grid"><h2 className="t-d2 gc-1-8" id="b6">Heavy on the eye, light on the wire.</h2></div>
            <ul className="out">{perf.scores.map(([v, l]) => <li key={l}><b>{v}</b><span className="mono mute">{l}</span></li>)}</ul>
          </div>
        </section>

        <Link className="nx on-bone" href="/work/wordsburg" data-cursor="view" aria-label="Next case, Wordsburg">
          <div className="wrap">
            <SecHead n="07" label="Next case" right="03 / 09 · Content platform" />
            <div className="nx-in" style={{ marginTop: 'var(--blk)' }}>
              <div className="nx-t"><span className="t-mega">Wordsburg</span><span className="lnk mono" style={{ alignSelf: 'flex-start' }}>See the case<Arrow /></span></div>
              <BrowserShot img="/img/work-wordsburg.jpg" url="wordsburg.com" sizes="448px" />
            </div>
          </div>
        </Link>
      </main>
      <ContactFooter />
      <SlashDrive />
    </>
  );
}

