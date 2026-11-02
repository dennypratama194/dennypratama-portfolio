import Image from 'next/image';
import Link from 'next/link';

export function Crumb({ parts }: { parts: [string, string?][] }) {
  return (
    <p className="ph-crumb mono">
      {parts.map(([label, href], i) => (
        <span key={label} style={{ display: 'contents' }}>
          {i > 0 && <i />}
          {href ? <Link href={href} data-cursor="link">{label}</Link> : <span aria-current="page">{label}</span>}
        </span>
      ))}
    </p>
  );
}

export function PageHead({ title, sup, lead, right }: { title: string; sup?: string; lead: string; right?: React.ReactNode }) {
  return (
    <section className="ph wrap" aria-labelledby="ph-h">
      <h1 className="ph-t t-giga" id="ph-h">
        <span>{title}</span>
        {sup && <sup className="mono">{sup}</sup>}
      </h1>
      <div className="ph-row grid">
        <p className="lead gc-1-6">{lead}</p>
        <div className="gc-7-12 ph-r">{right}</div>
      </div>
    </section>
  );
}

export function SecHead({ n, label, right, id }: { n: string; label: string; right?: React.ReactNode; id?: string }) {
  return (
    <div className="sec-head">
      <span className="mono">{n}</span>
      <span className="mono" id={id}>{label}</span>
      {right && <span className="mono push">{right}</span>}
    </div>
  );
}

/** 16:10 screenshot frame. */
export function Shot({ src, alt, sizes = '(max-width: 900px) 100vw, 66vw', pos, priority }: { src: string; alt: string; sizes?: string; pos?: string; priority?: boolean }) {
  return (
    <span className="shot">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={pos ? { objectPosition: pos } : undefined} />
    </span>
  );
}

