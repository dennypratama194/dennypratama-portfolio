import Link from 'next/link';
import { D_PATH, P_PATH } from '@/lib/site';
import { Social } from '@/components/Social';
import { Arrow } from '@/components/Icons';

export default function NotFound() {
  return (
    <main className="nf wrap">
      <div className="nf-g grid">
        <div className="nf-t gc-1-6">
          <p className="mono mute">Error 404</p>
          <h1 className="t-d2">This page fell through the gap.</h1>
          <p className="lead">The link is broken or the page has moved. Everything else is still where you left it.</p>
          <div className="nf-b">
            <Link className="btn" href="/" data-cursor="link">Back home<Arrow /></Link>
            <Link className="btn btn-line" href="/work" data-cursor="link">See the work</Link>
            <Link className="btn btn-line" href="/blog" data-cursor="link">Read the blog</Link>
          </div>
        </div>
        <div className="nf-v gc-7-12" aria-hidden="true">
          <svg viewBox="-600 -600 1200 1200">
            <g className="g"><circle r="512" /><circle r="256" /><line x1="-600" y1="0" x2="600" y2="0" /><line x1="0" y1="-600" x2="0" y2="600" /></g>
            <g className="hd"><path className="h" d={D_PATH} transform="translate(-150 -330) scale(.62)" /></g>
            <g className="hp"><path className="h" d={P_PATH} transform="translate(150 330) scale(.62)" /></g>
            <line className="r" x1="-700" y1="306" x2="700" y2="-306" />
          </svg>
          <span className="nf-n">404</span>
        </div>
      </div>
      <div className="nf-f"><p className="mono mute">This page does not exist</p><Social /></div>
    </main>
  );
}

