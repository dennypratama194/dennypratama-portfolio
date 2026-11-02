import { D_PATH as D, P_PATH as P } from '@/lib/site';

const rot = (path: string, deg: number) => `<path d="${path}" transform="rotate(${deg})"/>`;
const range = (a: number, b: number, s: number) => Array.from({ length: Math.floor((b - a) / s) + 1 }, (_, i) => a + i * s);

/** Seven compositions built from the mark itself: outline, construction, crop, ghosts, grid, split, solid. */
function art(kind: number) {
  switch (kind) {
    case 0:
      return '<g class="cv-l"><line x1="-900" y1="0" x2="900" y2="0"/><line x1="0" y1="-600" x2="0" y2="600"/><circle r="512"/><circle r="256"/></g>'
        + `<g class="cv-o" transform="scale(.82)"><path d="${D}"/><path d="${P}"/></g><g class="cv-f" transform="scale(.82)"><path d="${D}"/></g><circle class="cv-d" r="8"/>`;
    case 1:
      return '<g class="cv-l">' + range(-480, 480, 96).map((y) => `<line x1="-900" y1="${y}" x2="900" y2="${y}"/>`).join('')
        + range(-768, 768, 96).map((x) => `<line x1="${x}" y1="-600" x2="${x}" y2="600"/>`).join('') + '</g>'
        + `<line class="cv-r" x1="-1000" y1="436" x2="1000" y2="-436"/><g class="cv-f" transform="translate(-180 40) scale(.56)"><path d="${D}"/></g><g class="cv-o" transform="translate(180 -40) scale(.56)"><path d="${P}"/></g>`;
    case 2:
      return `<g class="cv-f" transform="translate(220 160) scale(1.9) rotate(-23.6)"><path d="${P}"/></g><g class="cv-l"><circle cx="-420" cy="-180" r="160"/><line x1="-900" y1="-180" x2="900" y2="-180"/></g><circle class="cv-d" cx="-420" cy="-180" r="8"/>`;
    case 3:
      return '<g class="cv-l" transform="scale(.8)">' + [30, 60, 90, 120, 150].map((a) => rot(D, a)).join('') + '</g>'
        + `<g class="cv-o" transform="scale(.8)"><path d="${D}"/></g><g class="cv-f" transform="scale(.8) rotate(180)"><path d="${D}"/></g><circle class="cv-d" r="8"/>`;
    case 4:
      return '<g class="cv-l">' + range(-720, 720, 128).map((x) => `<rect x="${x}" y="-600" width="80" height="1200" fill="currentColor" fill-opacity=".04" stroke="none"/>`).join('') + '</g>'
        + '<g class="cv-l"><rect x="-560" y="-320" width="1120" height="640" rx="8"/><rect x="-480" y="-200" width="560" height="64"/><rect x="-480" y="-104" width="400" height="24"/><rect x="-480" y="-56" width="320" height="24"/><rect x="-480" y="40" width="160" height="48" rx="24"/><rect x="160" y="-200" width="320" height="360"/></g>'
        + '<line class="cv-r" x1="-1000" y1="436" x2="1000" y2="-436"/>';
    case 5:
      return `<g class="cv-f" transform="translate(-210 -92) scale(.7)"><path d="${D}"/></g><g class="cv-f" transform="translate(210 92) scale(.7)"><path d="${P}"/></g><line class="cv-r" x1="-1000" y1="436" x2="1000" y2="-436"/>`
        + '<g class="cv-l"><line x1="-900" y1="0" x2="900" y2="0"/></g>';
    default:
      return `<g class="cv-f" transform="scale(.9)"><path d="${D}"/><path d="${P}"/></g><g class="cv-l"><rect x="-346" y="-512" width="692" height="1024" transform="scale(.9)"/><line x1="-900" y1="-460" x2="900" y2="-460"/><line x1="-900" y1="460" x2="900" y2="460"/></g>`;
  }
}

export function Cover({ n, kind, label, bone = false, className = '' }: { n?: number; kind: number; label: string; bone?: boolean; className?: string }) {
  return (
    <span className={`${className} cv${bone ? ' cv-b' : ''}`.trim()} aria-hidden="true">
      <svg viewBox="-800 -500 1600 1000" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{ __html: art(kind) }} />
      <span className="cv-k mono">{label}</span>
      {n !== undefined && <span className="cv-n">{String(n).padStart(2, '0')}</span>}
    </span>
  );
}

