import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { CATEGORIES, slugify } from './posts';
import { refreshBlog } from './revalidate';
import { SITE_URL } from './site';

/**
 * Auto-post: Claude writes one post in Markdown, which is saved as a draft (or published, if the admin says so).
 * Runs from the daily cron on the chosen weekdays, or from "Write one now" in the admin.
 */

export type AutoSettings = { enabled: boolean; days: number[]; publish: boolean };
// Monday and Thursday, saved as drafts until Denny has seen a few and trusts them
export const DEFAULT_SETTINGS: AutoSettings = { enabled: false, days: [1, 4], publish: false };

export async function getSettings(): Promise<AutoSettings> {
  const [r] = await db()<{ value: AutoSettings }[]>`SELECT value FROM settings WHERE key = 'auto_post'`;
  return { ...DEFAULT_SETTINGS, ...r?.value };
}
export async function saveSettings(s: AutoSettings) {
  await db()`INSERT INTO settings (key, value) VALUES ('auto_post', ${db().json(s)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

type Category = (typeof CATEGORIES)[number];

// topics Denny can stand behind: product design, and building his own designs with AI tools
const SEEDS: Record<Category, string[]> = {
  'UI/UX': [
    'empty states and zero-data screens', 'error states and inline form validation', 'onboarding and progressive disclosure',
    'microcopy on buttons, errors and empty states', 'navigation patterns: sidebar, tabs, command palette',
    'dashboard information density and hierarchy', 'tables and data-heavy screens', 'multi-step forms with saved state',
    'search and filtering UX', 'motion that explains state changes', 'design systems for a small team',
    'colour contrast and dark mode', 'type scales for product UI', 'pricing pages and checkout flows', 'designing for handoff to developers',
  ],
  Development: [
    'what a designer should know about CSS layout (grid, flex, container queries)', 'responsive type and spacing tokens in CSS',
    'scroll animation with GSAP without hurting performance', 'Core Web Vitals from a designer’s side: images, fonts, layout shift',
    'accessible components: focus, keyboard, ARIA basics', 'how a Figma file maps to components in code',
    'Next.js for a portfolio or marketing site', 'shipping a static site on Vercel', 'Git basics for designers who now ship code',
  ],
  AI: [
    'building your own designs with AI coding tools: where it helps, where it breaks', 'reviewing AI-written front-end code as a designer',
    'prompting for UI copy', 'AI for design QA and accessibility checks', 'designing AI features users trust',
    'when to trust AI output and when to verify', 'AI in the design-to-code handoff', 'designing loading and error states for AI features',
  ],
};

const ANGLES = [
  'a practical how-to with concrete steps',
  'an opinion with clear reasoning',
  'a before/after breakdown of a clearly hypothetical screen',
  'a checklist or pattern catalogue (numbered, scannable)',
  'a common mistake, why it happens, and how to avoid it',
];

const SECTIONS = ['TITLE', 'SLUG', 'EXCERPT', 'CATEGORY', 'FAQ', 'BODY'] as const;

function prompt(category: Category, recent: { title: string; slug: string; category: string; live: boolean }[], avoid: string) {
  const angle = ANGLES[new Date().getUTCDate() % ANGLES.length];
  return `You are writing a blog post for Denny Pratama's site, in his voice.

WHO DENNY IS (stick to this, it is all true):
- A product designer in Indonesia. Since 2018 he has designed SaaS products, dashboards and marketing sites, mostly through Upwork.
- For most of those years developers built what he designed. Recently he started building his own designs, using AI coding tools. He is not a veteran engineer and must never sound like one.

HONESTY RULES (the most important part):
- Never invent experiences. No "on a recent project", "a client of mine", "we saw a 30% lift", "I spent two days debugging", no made-up clients, numbers, quotes or studies.
- First person is fine for opinions and reasoning ("I'd start with the empty state because...").
- Illustrate with clearly hypothetical examples ("Say a signup form has eight fields...").
- Only cite facts that are widely documented (WCAG criteria, browser behaviour, public guidelines). If unsure, leave it out.

THIS POST:
- Category: ${category}
- Angle: ${angle}
- Pick ONE topic from this list, or something equally specific in the same category. Avoid the most obvious choice:
${SEEDS[category].map((s) => `  - ${s}`).join('\n')}

ALREADY PUBLISHED. Do not repeat or closely rework any of these:
${recent.map((r) => `- "${r.title}" [${r.category}]`).join('\n') || '(none yet)'}
${avoid}
WRITING:
- 1000 to 1500 words. Plain, direct English. Short paragraphs. No filler intro, no "In today's fast-paced world".
- Structure with ## sections (4 to 7) and ### where useful. Concrete takeaways.
- Link to one or two of the posts above only where it genuinely helps, as Markdown links to ${SITE_URL}/blog/<slug>:
${recent.filter((r) => r.live).slice(0, 12).map((r) => `  - ${r.title}: ${SITE_URL}/blog/${r.slug}`).join('\n') || '  (none)'}
- End with a "## Frequently asked questions" section repeating the three FAQ questions as ### headings, each followed by its answer.

FORMAT: plain Markdown only (no HTML, no images, no tables wider than 4 columns). Reply with exactly these markers, each on its own line, nothing before or after:

===TITLE===
A specific, useful title (under 70 characters)
===SLUG===
url-slug-from-the-title
===EXCERPT===
One or two sentences for the listing, under 160 characters
===CATEGORY===
${category}
===FAQ===
Q: A question readers ask about this topic?
A: A direct answer in 2 or 3 sentences.
Q: ...
A: ...
Q: ...
A: ...
===BODY===
The full post in Markdown, without the title
===END===`;
}

// "Q: ...\nA: ..." pairs, as auto-post writes them and the editor shows them
export const parseFaq = (s: string) =>
  s.trim().split(/\n+(?=Q:)/).flatMap((b) => {
    const m = b.match(/^Q:\s*(.+)\n+A:\s*([\s\S]+)$/);
    return m ? [{ q: m[1].trim(), a: m[2].trim() }] : [];
  });

export function parseSections(text: string) {
  if (!text.includes('===END===')) return null;
  const out: Partial<Record<(typeof SECTIONS)[number], string>> = {};
  for (const m of text.matchAll(/===([A-Z]+)===\n([\s\S]*?)(?=\n===[A-Z]+===)/g)) {
    if ((SECTIONS as readonly string[]).includes(m[1])) out[m[1] as (typeof SECTIONS)[number]] = m[2].trim();
  }
  if (!out.TITLE || !out.BODY) return null;
  const faq = parseFaq(out.FAQ ?? '');
  return { title: out.TITLE, slug: slugify(out.SLUG || out.TITLE).slice(0, 80), excerpt: out.EXCERPT ?? '', body: out.BODY, faq };
}

// word overlap between two titles; 0.5 or more reads as the same topic
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
function overlap(a: string, b: string) {
  const x = words(a), y = words(b);
  const inter = [...x].filter((w) => y.has(w)).length;
  return inter / Math.max(1, new Set([...x, ...y]).size);
}

async function write(text: string) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const msg = await client.beta.messages.stream({
    model: 'claude-sonnet-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    // if the model declines, the API retries on Anthropic's recommended fallback model inside the same call
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: text }],
  }).finalMessage();
  const out = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  return { out, stop: msg.stop_reason };
}

export type RunResult = { ok: boolean; message: string; postId?: number };

export async function runAutoPost(slot?: string): Promise<RunResult> {
  const sql = db();
  // one run at a time: the run row is claimed under a lock, so a second cron call or a double click on Run now
  // while one is writing can't start a second paid model call. A run that died without finishing frees the slot
  // after 10 minutes (functions stop at 5).
  const run = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('auto_post_runs'))`;
    if (slot) {
      const [claimed] = await tx`SELECT 1 FROM auto_post_runs WHERE slot = ${slot}`;
      if (claimed) return null;
    }
    const [busy] = await tx`SELECT 1 FROM auto_post_runs WHERE ok IS NULL AND started_at > now() - interval '10 minutes'`;
    if (busy) return null;
    const [row] = await tx<{ id: number }[]>`INSERT INTO auto_post_runs (slot) VALUES (${slot ?? null}) RETURNING id`;
    return row;
  });
  if (!run) return { ok: false, message: 'Another run is already writing a post, or this scheduled run was already claimed.' };
  const finish = async (r: RunResult, raw?: string) => {
    await sql`UPDATE auto_post_runs SET ok = ${r.ok}, post_id = ${r.postId ?? null}, message = ${r.message}, raw = ${raw ?? null} WHERE id = ${run.id}`;
    return r;
  };
  try {
    if (!process.env.ANTHROPIC_API_KEY) return finish({ ok: false, message: 'ANTHROPIC_API_KEY is not set.' });
    const settings = await getSettings();
    // drafts and scheduled posts still count as taken topics, but only live posts may be linked: a held-back slug redirects to /blog
    const recent = await sql<{ title: string; slug: string; category: string; live: boolean }[]>`
      SELECT title, slug, category, (status = 'published' AND published_at <= now()) AS live
      FROM posts ORDER BY coalesce(published_at, created_at) DESC LIMIT 30`;

    // the category least used in the last nine posts goes next
    const counts = new Map<Category, number>(CATEGORIES.map((c) => [c, 0]));
    for (const r of recent.slice(0, 9)) if (counts.has(r.category as Category)) counts.set(r.category as Category, counts.get(r.category as Category)! + 1);
    const category = [...counts].sort((a, b) => a[1] - b[1])[0][0];

    let avoid = '';
    let post: NonNullable<ReturnType<typeof parseSections>> | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { out, stop } = await write(prompt(category, recent, avoid));
      if (stop === 'refusal') return finish({ ok: false, message: 'The model declined to write this post.' }, out);
      if (stop === 'max_tokens') return finish({ ok: false, message: 'The post was cut off before it finished.' }, out);
      const parsed = parseSections(out);
      if (!parsed) return finish({ ok: false, message: 'The reply was missing a section, so nothing was saved.' }, out);
      post = parsed;
      const clash = recent.find((r) => overlap(r.title, parsed.title) >= 0.5);
      if (!clash) break;
      avoid = `\nA previous attempt produced "${parsed.title}", which overlaps the existing post "${clash.title}". Pick a completely different topic.\n`;
    }
    if (!post) return finish({ ok: false, message: 'Nothing was written.' });

    // a slug that's taken gets a number
    let slug = post.slug || slugify(post.title);
    const taken = new Set((await sql<{ slug: string }[]>`SELECT slug FROM posts WHERE slug LIKE ${slug + '%'}
      UNION SELECT from_slug FROM redirects WHERE from_slug LIKE ${slug + '%'}`).map((r) => r.slug));
    for (let i = 2; taken.has(slug); i++) slug = `${post.slug}-${i}`;

    const status = settings.publish ? 'published' : 'draft';
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO posts (slug, title, excerpt, body, category, faq, status, published_at, source)
      VALUES (${slug}, ${post.title}, ${post.excerpt.slice(0, 300)}, ${post.body}, ${category}, ${sql.json(post.faq)},
        ${status}, ${settings.publish ? sql`now()` : null}, 'auto')
      RETURNING id`;
    if (settings.publish) refreshBlog();
    return finish({ ok: true, postId: row.id, message: `${settings.publish ? 'Published' : 'Saved as a draft'}: “${post.title}”` });
  } catch (e) {
    return finish({ ok: false, message: e instanceof Error ? e.message : String(e) });
  }
}

