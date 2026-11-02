import { Quotes } from './Quotes';

const STATS = [
  { to: 98, suf: '%', label: 'Job Success', sub: 'Upwork · Top Rated', sr: '98% Job Success' },
  { to: 28, suf: 'K', label: 'Followers', sub: 'Dribbble', sr: '28K Followers' },
  { to: 97, suf: '', label: 'Projects', sub: 'Upwork', sr: '97 Projects on Upwork' },
  { to: 8, suf: '', label: 'Years designing', sub: 'Since 2018', sr: '8 Years designing, since 2018' },
  { to: 5, suf: '.0', label: 'Average rating', sub: 'From 71 Upwork reviews', sr: '5.0 Average rating from 71 Upwork reviews' },
];

/** Testimonials and the stats index. The quotes run in Quotes; the count-up is scrubbed in ScrollFx. */
export function Proof() {
  return (
    <section className="proof on-bone" aria-label="In their words">
      <Quotes />
      <div className="wrap">
        <ul className="stx">
          {STATS.map((s) => (
            <li className="sx" style={{ '--to': s.to } as React.CSSProperties} key={s.label}>
              <span className="sx-v" aria-hidden="true">
                <span className="sx-o"><i className="sx-n" />{s.suf}</span>
                <span className="sx-s"><i className="sx-n" />{s.suf}</span>
              </span>
              <span className="sr">{s.sr}</span>
              <span className="sx-l"><b>{s.label}</b><span className="mono mute">{s.sub}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

