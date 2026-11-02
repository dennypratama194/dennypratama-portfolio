// Every number here is read from the build: the shader, the hero's quality ladder and the Lighthouse run.
// Re-measure before changing one.

export const SITE_CASE = {
  intro: 'My own portfolio, designed and built by me in 2026. One mark, one angle and one scroll clock, with a raymarched tunnel through the logo and no 3D engine underneath it.',
  meta: [
    ['Client', 'Myself'],
    ['Role', 'Identity, UI, front end, shader'],
    ['Stack', 'Next.js 16, GSAP, Lenis, WebGL2'],
    ['Year', '2026'],
  ] as [string, string][],
  tunnel: {
    text: 'The hero is one full-screen fragment shader. The marks are signed distance fields, so the same eleven points that draw the logo in the nav also build the solids you fly through.',
    code: `/* each half of the mark is one 11-point polygon */
float sdLogo(vec2 p) {
  /* the p is the d, turned 180° */
  return min(sdPoly(p), sdPoly(-p));
}

/* march until the surface is closer than a pixel */
for (int i = 0; i < 220; i++) {
  if (i >= N || t >= tMax) break;
  float d = mapT(ro + rd * t, id, lq, lz);
  if (d < 0.0004 * max(t, 1.0)) { hit = true; break; }
  t += d * 0.9;
}`,
    facts: [
      ['11', 'points per half of the mark, the only geometry in the scene'],
      ['150', 'march steps per pixel, with 4 more for ambient occlusion'],
      ['62%', 'starting render scale, stepping down to 42% when frames run slow'],
      ['34 ms', 'counts as a slow frame. Still too slow at 42%, and the hero swaps to a still'],
      ['0', 'march steps for the blueprint marks: 12 ray and plane hits, solved directly'],
      ['4 cores', 'or fewer, reduced motion, or no WebGL2: the still and a frame-by-frame story instead'],
    ] as [string, string][],
  },
  slash: {
    text: 'The slash is a number, not a picture. One function projects any point onto the 23.6° line, and CSS clips along the same line, so a pointer, a scroll position and a page transition all cut the same way.',
    code: `/* 0: the line has not entered, 1: it has left */
slashAt = (px, py, w, h) =>
  clamp01((py + 0.4369 * (px - w / 2) + 0.2185 * w)
    / (h + 0.4369 * w));

/* and in CSS, the live side is clipped to match */
.sl-live {
  clip-path: polygon(0 0, 100% 0,
    100% calc(var(--s) * (100cqh + 43.69cqw) - 43.69cqw),
    0 calc(var(--s) * (100cqh + 43.69cqw)));
}`,
    uses: [
      'The case heroes and the /work list: the drawing under, the live site over',
      'The end of the tunnel, which opens onto the first project',
      'Both Sides, scrubbed by the pointer',
      'The page transitions, a panel skewed to 23.6°',
      'The name and number wipes, a 156.4° mask (180° minus 23.6°)',
    ],
  },
  stack: [
    ['Framework', 'Next.js 16 with the App Router. Every route is static HTML, so the first paint never waits on a server.'],
    ['Motion', 'Lenis, GSAP and ScrollTrigger share one ticker. Scroll is read once per frame and written into CSS custom properties, and the CSS does the rest with calc().'],
    ['3D', 'Raw WebGL2: one program, one triangle, about 7 KB of shader. No three.js, nothing to download before the tunnel starts.'],
    ['Type', 'Archivo as a variable font. The width axis runs from 62% in the intro to 118% in the stats, so one file covers every voice.'],
    ['Blueprints', 'The blueprint side of each preview is an edge pass over the live screenshot, made at build time by a small Python script, until the real Figma frames replace it.'],
  ] as [string, string][],
  perf: {
    how: 'Lighthouse 13 · production build',
    // Lighthouse 13.5 on the home page, two runs each on 2026-10-13 after the concepts landed: phone 89 and 86, desktop 97 both
    // times; the lower phone run is the one shown. Re-measure after changing anything on the home page.
    scores: [
      ['86', 'Performance, home page on a throttled phone'],
      ['97', 'Performance, home page on desktop'],
      ['0', 'Layout shift, on every page measured'],
    ] as [string, string][],
  },
};

