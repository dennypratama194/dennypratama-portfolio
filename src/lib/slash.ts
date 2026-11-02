/** The site's one angle. Everything that cuts (nav, page transitions, previews, Both Sides) uses it. */
export const SLASH = 23.6;
/** tan 23.6° × 2: how far the slash drops across a box, as a share of its width. */
const DROP = 0.4369;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Where a point sits along a box's 23.6° sweep, 0 (the line has not entered) to 1 (it has left).
 * Matches the clip-path in CSS: polygon(... calc(var(--s) * (100cqh + 43.69cqw) - 43.69cqw) ...).
 */
export const slashAt = (px: number, py: number, w: number, h: number) =>
  clamp01((py + DROP * (px - w / 2) + (DROP / 2) * w) / (h + DROP * w));

/** A drawing for every live screenshot: /img/work-x.jpg → /img/draw-x.webp, made by scripts/drawings.py. */
export const drawingFor = (img: string) => img.replace('/work-', '/draw-').replace(/\.jpg$/, '.webp');

