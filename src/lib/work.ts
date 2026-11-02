export type Work = {
  k: string; name: string; cat: string; fil: string; desc: string; short: string;
  tags: string[]; href: string; go: string; ext: boolean; img: string;
  /** a real Figma frame export; without it the slash shows the generated drawing */
  fig?: string;
  /** a short muted loop of the live site for the work previews (mp4 or webm under /public/video); the image is its poster */
  video?: string;
  /** a self-initiated concept, not client work: labelled as such and opens in the case viewer */
  concept?: boolean;
  /** has a live scene in src/components/concept that plays in the previews and the case viewer */
  scene?: boolean;
};

// the live Morrow tool; one place to change when it moves to its own domain
export const MORROW_URL = 'https://morrow-hazel.vercel.app';

export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'saas', label: 'SaaS & software' },
  { key: 'agency', label: 'Agency & studio' },
  { key: 'content', label: 'Content' },
  { key: 'health', label: 'Health' },
] as const;

// the real client work shown in depth on /work
export const CLIENT: Work[] = [
  { k: 'revo', name: 'Digital Revo', cat: 'Digital agency', fil: 'agency', desc: 'My own studio. Website design and build, from brand to launch.', short: 'Website design and build, from brand to launch', tags: ['Brand', 'Web design', 'Build'], href: 'https://digitalrevo.id', go: 'digitalrevo.id', ext: true, img: '/img/work-digitalrevo.jpg', scene: true },
  { k: 'xertra', name: 'Xertra', cat: 'SaaS platform', fil: 'saas', desc: 'Dashboard redesign for a faster, clearer product workflow.', short: 'Dashboard redesign for a faster, clearer product workflow', tags: ['Product design', 'Dashboard', 'Design system'], href: 'https://xertra.com', go: 'xertra.com', ext: true, img: '/img/work-xertra.jpg' },
  { k: 'wordsburg', name: 'Wordsburg', cat: 'Content platform', fil: 'content', desc: 'End-to-end UI/UX design, down to the article template the team publishes with.', short: 'End-to-end UI/UX design, down to the article template', tags: ['UI/UX', 'Design system', 'Content'], href: '/work/wordsburg', go: 'Read the case', ext: false, img: '/img/work-wordsburg.jpg' },
  { k: 'brenom', name: 'Brenom Systems', cat: 'Enterprise software', fil: 'saas', desc: 'Full interface overhaul for complex internal tooling.', short: 'Full interface overhaul for complex internal tooling', tags: ['UI/UX', 'Enterprise'], href: 'https://brenom-systems-3.vercel.app/', go: 'brenom-systems.com', ext: true, img: '/img/work-brenom.jpg' },
];

// self-initiated work: invented products built to show motion, labelled as concepts, plus Morrow, the one that became a real tool
export const CONCEPTS: Work[] = [
  { k: 'halden', name: 'Halden', cat: 'Concept · SaaS revenue analytics', fil: 'saas', desc: 'A self-initiated concept: a SaaS launch page for revenue analytics, with orbiting integrations and a live dashboard. Not client work.', short: 'Self-initiated concept: a SaaS launch with a live dashboard', tags: ['Concept', 'SaaS', 'Product UI'], href: '#case-halden', go: 'Open the concept', ext: false, img: '/img/work-halden.jpg', concept: true, scene: true },
  { k: 'noctua', name: 'Noctua', cat: 'Concept · AI agent tracing', fil: 'saas', desc: 'A self-initiated concept: tracing for AI agents, with the agent graph running live. Not client work.', short: 'Self-initiated concept: AI agent tracing, running live', tags: ['Concept', 'Data viz', 'Canvas'], href: '#case-noctua', go: 'Open the concept', ext: false, img: '/img/work-noctua.jpg', concept: true, scene: true },
  { k: 'morrow', name: 'Morrow', cat: 'Built by me · time zone scheduling', fil: 'saas', desc: 'A free tool I built for teams spread across time zones. It finds the hours everyone shares, and when there are none it rotates the late call so the same person stops taking it. No sign-up.', short: 'Finds meeting times across time zones and rotates the late call', tags: ['Built by me', 'Free tool', 'Time zones'], href: MORROW_URL, go: new URL(MORROW_URL).host, ext: true, img: '/img/work-morrow.jpg', scene: true },
  { k: 'fieldline', name: 'Fieldline', cat: 'Concept · wind intelligence', fil: 'saas', desc: 'A self-initiated concept: a forecasting product for wind farms, designed and built to show motion. Not client work.', short: 'Self-initiated concept: wind forecasting, built to move', tags: ['Concept', 'Motion', 'Canvas'], href: '#case-fieldline', go: 'Open the concept', ext: false, img: '/img/work-fieldline.jpg', concept: true, scene: true },
];

// the home index: my own studio first, where the tunnel lands, then the concepts
export const WORK: Work[] = [CLIENT[0], ...CONCEPTS];

export const MORE: Work[] = [
  { k: 'more', name: 'MoRe', cat: 'Creative agency', fil: 'agency', desc: 'Brand identity paired with a web presence.', short: '', tags: ['Brand identity', 'Web design'], href: 'https://morecreativeagency.com', go: 'morecreativeagency.com', ext: true, img: '/img/work-more.jpg' },
  { k: 'claims', name: 'Claims Management', cat: 'Fintech · claims software', fil: 'saas', desc: 'Marketing site for a PCP and HP claims platform.', short: '', tags: [], href: '', go: '', ext: false, img: '/img/also-claims.jpg' },
  { k: 'discryptic', name: 'Discryptic', cat: 'Venture studio', fil: 'agency', desc: 'Studio site for a builder of AI, finance and compliance brands.', short: '', tags: [], href: '', go: '', ext: false, img: '/img/also-discryptic.jpg' },
  { k: 'labme', name: 'LabMe', cat: 'Health · at-home testing', fil: 'health', desc: 'Shop and results dashboard for at-home blood tests.', short: '', tags: [], href: '', go: '', ext: false, img: '/img/also-labme.jpg' },
  { k: 'qwikgig', name: 'QwikGig', cat: 'Development agency', fil: 'agency', desc: 'Agency site designed to turn intro calls into projects.', short: '', tags: [], href: '', go: '', ext: false, img: '/img/also-qwikgig.jpg' },
];

// client work only; the concepts are counted apart
export const ALL_WORK = [...CLIENT, ...MORE];
export const countFor = (key: string) => (key === 'all' ? ALL_WORK.length : ALL_WORK.filter((w) => w.fil === key).length);

