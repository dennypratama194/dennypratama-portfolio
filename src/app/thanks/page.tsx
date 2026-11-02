import type { Metadata } from 'next';
import Link from 'next/link';
import { Mark } from '@/components/Mark';
import { Arrow } from '@/components/Icons';
import { EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Thanks', robots: { index: false } };

const STEPS: [string, React.ReactNode][] = [
  ['I read it and reply', 'Usually with a few questions about goals, timing and budget.'],
  ['A clear scope and price', 'One page: what I’ll do, what it costs and when you’ll see it.'],
];

export default function ThanksPage() {
  return (
    <main className="on-bone">
      <div className="ty wrap">
        <div className="ty-g grid">
          <div className="ty-t gc-1-6">
            <p className="ty-ok mono"><i />Message sent</p>
            <h1 className="t-d2">Thanks. It’s in my inbox.</h1>
            <p className="lead">I read every message myself. Here’s what happens next, so you’re never left guessing.</p>
            <div className="ty-l">
              <Link className="btn btn-ink" href="/work" data-cursor="link">See the work<Arrow /></Link>
              <Link className="btn btn-line" href="/blog" data-cursor="link">Read the blog</Link>
            </div>
          </div>
          <div className="gc-7-12">
            <p className="mono mute" style={{ marginBottom: 16 }}>What happens next</p>
            <ol className="ty-s">{STEPS.map(([a, b], i) => <li key={a}><span className="mono">0{i + 1}</span><div><h3>{a}</h3><p>{b}</p></div></li>)}</ol>
          </div>
        </div>
        <Mark className="dpm ty-m" />
        <div className="ty-f"><p className="mono"><Link href="/" data-cursor="link">← Back home</Link></p><p className="mono mute">Need it faster? {EMAIL}</p></div>
      </div>
    </main>
  );
}

