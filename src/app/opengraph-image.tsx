import { ImageResponse } from 'next/og';
import { D_PATH, MARK_VB, P_PATH } from '@/lib/site';

export const alt = 'Denny Pratama. I design it. I build it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0C0C0B', color: '#ECEAE4', padding: 64, position: 'relative', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div style={{ fontSize: 28, color: '#C9C6BE' }}>Denny Pratama · Product designer</div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 104, lineHeight: 1, letterSpacing: -4 }}>
            <span style={{ fontWeight: 300 }}>I design it.</span>
            <span style={{ fontWeight: 700 }}>I build it.</span>
          </div>
          <div style={{ fontSize: 28, color: '#FF4F2B' }}>dennypratama.com</div>
        </div>
        <svg viewBox={MARK_VB} width={300} height={444} style={{ position: 'absolute', right: 96, top: 93 }}>
          <path d={D_PATH} fill="#ECEAE4" />
          <path d={P_PATH} fill="#ECEAE4" />
        </svg>
      </div>
    ),
    size,
  );
}

