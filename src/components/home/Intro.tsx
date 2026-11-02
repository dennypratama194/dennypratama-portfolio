import { D_PATH, MARK_VB } from '@/lib/site';

/** The loader: the d is drawn, turns 180° into the p, then the halves part. Pure CSS, first visit only. */
export function Intro() {
  return (
    <div className="ld" aria-hidden="true">
      <div className="ld-bg" />
      <div className="ld-in">
        <svg className="ld-mk" viewBox={MARK_VB}>
          <g className="ld-gh">
            {[30, 60, 90, 120, 150].map((a) => <path key={a} d={D_PATH} style={{ rotate: `${a}deg` }} />)}
          </g>
          <g className="ld-dg"><path className="ld-b" pathLength={100} d={D_PATH} /></g>
          <g className="ld-pg"><path className="ld-m" d={D_PATH} /></g>
        </svg>
        <p className="ld-deg num"><span className="ld-num" />°</p>
        <p className="ld-c ld-tl mono">denny pratama</p>
        <p className="ld-c ld-tr mono">Portfolio 2026</p>
        <p className="ld-c ld-br mono">Turning d into p</p>
      </div>
    </div>
  );
}

