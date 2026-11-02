import Image from 'next/image';

type Props = { img: string; video?: string; sizes: string; className?: string };

/**
 * A project's full frame: the screenshot, and later a short muted loop over it. The video carries the screenshot as
 * its poster and loads nothing until its owner plays it, so a missing or slow file still shows the image.
 */
export function ShotMedia({ img, video, sizes, className }: Props) {
  // an mp4 goes first, since H.264 is decoded in hardware almost everywhere; its WebM twin covers Chromium builds without it
  return (
    <span className={`sm${className ? ` ${className}` : ''}`} aria-hidden="true">
      <Image src={img} alt="" fill sizes={sizes} />
      {video && <video poster={posterOf(img)} muted loop playsInline preload="none">{videoSources(video)}</video>}
    </span>
  );
}

/**
 * A loop's poster through the image optimizer: the same picture as the <Image> under it, about a quarter of the bytes
 * of the original jpg. A poster downloads with the page whether or not the video ever plays.
 */
export const posterOf = (img: string) => `/_next/image?url=${encodeURIComponent(img)}&w=1080&q=75`;

/** The <source>s for a loop: an mp4 also offers the .webm beside it. */
export function videoSources(video: string) {
  return video.endsWith('.mp4')
    ? <><source src={video} type="video/mp4" /><source src={video.replace(/\.mp4$/, '.webm')} type="video/webm" /></>
    : <source src={video} />;
}

