/**
 * The contact form's fields, shared by the form and /api/contact. The server checks every field again here,
 * since anything can post to the API, and the chips only accept the values the form offers.
 */
export const NEEDS = ['Product or SaaS design', 'Website design', 'Design system', 'Not sure yet'];
export const WHEN = ['As soon as possible', 'In 1–3 months', 'Just exploring'];

export type Brief = { name: string; email: string; link: string; brief: string; need: string[]; when: string };
export type Field = 'name' | 'email' | 'link' | 'brief';
export type Checked = { kind: 'ok'; brief: Brief } | { kind: 'bot' } | { kind: 'bad' } | { kind: 'invalid'; fields: Field[] };

const LIMITS = { name: 120, email: 254, link: 300, brief: 5000 } as const;
// control characters, so a name can't add lines to the mail's subject
const CTRL = /[\u0000-\u001f\u007f]+/g;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const line = (v: unknown) => str(v).replace(CTRL, ' ').replace(/\s+/g, ' ');

export const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

export function checkBrief(b: unknown): Checked {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { kind: 'bad' };
  const o = b as Record<string, unknown>;
  // a hidden field people never see; bots fill it in
  if (str(o.website)) return { kind: 'bot' };

  const name = line(o.name);
  const email = line(o.email);
  const link = line(o.link);
  // the brief keeps its line breaks, minus other control characters
  const brief = str(o.brief).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '');

  const fields: Field[] = [];
  if (!name || name.length > LIMITS.name) fields.push('name');
  if (email.length > LIMITS.email || !EMAIL_RE.test(email)) fields.push('email');
  if (link.length > LIMITS.link) fields.push('link');
  if (brief.length < 2 || brief.length > LIMITS.brief) fields.push('brief');
  if (fields.length > 0) return { kind: 'invalid', fields };

  const need = Array.isArray(o.need) ? [...new Set(o.need.filter((x): x is string => NEEDS.includes(x as string)))] : [];
  const when = WHEN.includes(o.when as string) ? (o.when as string) : '';
  return { kind: 'ok', brief: { name, email, link, brief, need, when } };
}

/** The mail as plain text, also used for the "email it instead" fallback */
export function briefText(b: Pick<Brief, 'link' | 'need' | 'when' | 'brief'>) {
  const facts = [b.link && `Company or link: ${b.link}`, b.need.length > 0 && `Needs: ${b.need.join(', ')}`, b.when && `When: ${b.when}`];
  return [facts.filter(Boolean).join('\n'), b.brief].filter(Boolean).join('\n\n');
}

