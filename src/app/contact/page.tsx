import type { Metadata } from 'next';
import Link from 'next/link';
import { AVAILABILITY, EMAIL, NEXT_STEPS, SOCIAL } from '@/lib/site';
import { SecHead } from '@/components/PageParts';
import { ContactForm } from '@/components/pages/ContactForm';
import { Arrow, Dribbble, LinkedIn, Upwork } from '@/components/Icons';
import { Clock } from '@/components/Clock';
import { ContactFooter } from '@/components/ContactFooter';

const SOCIAL_ICON: Record<string, React.ReactNode> = { Dribbble: <Dribbble />, LinkedIn: <LinkedIn />, Upwork: <Upwork /> };

export const metadata: Metadata = {
  title: 'Contact for product design & development',
  description: 'Discuss your SaaS product, dashboard or website with Denny Pratama. Share your project brief, timeline and budget to get started.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
    <main className="ctp on-bone">
      <section className="ctp-h wrap" aria-labelledby="ph-h">
        <div className="ctp-g grid">
          <div className="ctp-t gc-1-5">
            <h1 className="t-d2" id="ph-h"><span className="ctp-ln"><span>Tell me what</span></span> <span className="ctp-ln"><span>you’re working on.</span></span></h1>
            <p className="lead">A few lines is enough. I read every message myself.</p>
            <div className="ctp-meta mono">
              <p className="av"><i />{AVAILABILITY}</p>
              <p>Indonesia · <Clock /> GMT+7</p>
            </div>
            <ul className="ctp-d">
              <li><a href={`mailto:${EMAIL}`} data-cursor="link"><span className="mono mute">Email</span><span>{EMAIL}</span><Arrow /></a></li>
              <li className="ctp-so">
                {SOCIAL.map((s) => <a key={s.name} href={s.href} target="_blank" rel="noopener" aria-label={s.name} title={s.name} data-cursor="link">{SOCIAL_ICON[s.name]}</a>)}
              </li>
            </ul>
          </div>
          <div className="gc-7-12 ctp-f"><ContactForm /></div>
        </div>
      </section>
      <section className="ctp-n wrap" aria-labelledby="ctp-n-h">
        <SecHead n="01" label="What happens next" id="ctp-n-h" />
        <ol className="stx stx-s">
          {NEXT_STEPS.map(([a, b], i) => (
            <li className="sx" style={{ '--to': i + 1 } as React.CSSProperties} key={a}>
              <span className="sx-v" aria-hidden="true">
                <span className="sx-o"><i className="sx-n" /></span>
                <span className="sx-s"><i className="sx-n" /></span>
              </span>
              <span className="sx-l"><b>{a}</b><span className="mute">{b}</span></span>
            </li>
          ))}
        </ol>
        <div className="ty-f"><p className="mono"><Link href="/" data-cursor="link">← Back home</Link></p><p className="mono"><Link href="/work" data-cursor="link">See the work →</Link></p></div>
      </section>
    </main>
    <ContactFooter />
    </>
  );
}

