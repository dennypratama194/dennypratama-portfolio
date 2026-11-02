import Image from 'next/image';
import { Mark } from './Mark';
import { drawingFor } from '@/lib/slash';

type Props = {
  img: string; fig?: string; sizes: string; className?: string; priority?: boolean;
  /** describes the picture; without it the shot is decorative */
  alt?: string;
  /** who moves the slash, for SlashDrive: 'scroll' sweeps it as the shot crosses the screen, 'sweep' runs it once on load */
  drive?: 'scroll' | 'sweep';
};

/**
 * One project, both sides of the slash: the drawing under, the live site over, cut at 23.6° by --s (0 all drawing,
 * 1 all live). Whoever owns it sets --s: the pointer, the scroll, or a one-off sweep. Until a real Figma frame exists
 * the drawing is generated from the screenshot, and it says so.
 */
export function SlashShot({ img, fig, sizes, className, priority, alt, drive }: Props) {
  const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
  return (
    <span className={`sl${className ? ` ${className}` : ''}`} data-drive={drive} {...a11y}>
      <Image className="sl-d" src={fig ?? drawingFor(img)} alt="" fill sizes={sizes} priority={priority} />
      <span className="sl-live"><Image src={img} alt="" fill sizes={sizes} priority={priority} /></span>
      <span className="sl-line" />
      <span className="sl-h"><Mark /></span>
      <span className="sl-t sl-tl mono"><i />Live</span>
      <span className="sl-t sl-td mono">{fig ? 'Figma · 1440' : 'Blueprint · traced'}</span>
    </span>
  );
}

