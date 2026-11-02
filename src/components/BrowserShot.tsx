import Image from 'next/image';

type Props = {
  img: string; sizes: string; className?: string; priority?: boolean;
  /** what the address bar shows: the real domain when there is one, otherwise the product's name */
  url: string;
  /** describes the picture; without it the shot is decorative */
  alt?: string;
  /** a short muted loop of the live site, played while the pointer is on it (or while it is on screen, on touch) */
  video?: string;
  /** 'rise': the window rises into its stage as it crosses the screen; without it the window sits still */
  drive?: 'rise';
};

/**
 * A client site shown as it is: the real screenshot in a plain browser window, standing in a dark stage and cropped
 * by its bottom edge. No drawing, no slash: most of this work was design only, and the slash says "drawn and built".
 * MockDrive moves the ones that ask for it and plays their loops.
 */
export function BrowserShot({ img, sizes, className, priority, url, alt, video, drive }: Props) {
  const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
  return (
    <span className={`bw${className ? ` ${className}` : ''}`} data-drive={drive} {...a11y}>
      <span className="bw-win">
        <span className="bw-bar"><i /><i /><i /><span className="bw-url">{url}</span></span>
        <span className="bw-view">
          <Image src={img} alt="" fill sizes={sizes} priority={priority} />
          {/* no poster: the loop stays transparent until it plays, and the <Image> under it is the still */}
          {video && <video src={video} muted loop playsInline preload="none" />}
        </span>
      </span>
    </span>
  );
}

