import { EMAIL } from '@/lib/site';
import { briefText, checkBrief } from '@/lib/contact';
import { allowContact } from '@/lib/rateLimit';
import { readJson } from '@/lib/request';
import { ipHash } from '@/lib/visitor';

/**
 * The contact form posts here. It mails the brief through Resend when RESEND_API_KEY is set (CONTACT_TO and
 * CONTACT_FROM override the addresses). Every failure answers with a reason, and the form shows it with the option
 * to email the brief instead, so no message is lost silently.
 *   400 bad      not JSON, or too big (413), not sent as JSON (415), or from another site (403)
 *   422 invalid  { fields } that need fixing
 *   429 limited  too many sends from this address, or in total, this hour
 *   503 busy     the rate limit's database didn't answer, so nothing is sent (it fails closed)
 *   503 unconfigured, 502 send   mail isn't set up, or Resend refused
 */
const fail = (status: number, reason: string, extra: object = {}) => Response.json({ ok: false, reason, ...extra }, { status });

export async function POST(req: Request) {
  const read = await readJson(req, 20_000);
  if (!read.ok) return fail(read.status, 'bad');
  const c = checkBrief(read.body);
  if (c.kind === 'bad') return fail(400, 'bad');
  // looks sent to the bot, so it doesn't try again
  if (c.kind === 'bot') return Response.json({ ok: true });
  if (c.kind === 'invalid') return fail(422, 'invalid', { fields: c.fields });

  const allowed = await allowContact(ipHash(req.headers)).catch((e) => {
    console.error('contact: rate limit unavailable', e instanceof Error ? e.message : e);
    return null;
  });
  if (allowed === null) return fail(503, 'busy');
  if (!allowed) return fail(429, 'limited');

  const key = process.env.RESEND_API_KEY;
  if (!key) return fail(503, 'unconfigured');

  const b = c.brief;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM ?? 'dennypratama.com <onboarding@resend.dev>',
      to: [process.env.CONTACT_TO ?? EMAIL],
      reply_to: b.email,
      subject: `New brief from ${b.name}`,
      text: `From: ${b.name} <${b.email}>\n\n${briefText(b)}`,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!r?.ok) {
    // the status only, never the key; it shows in Vercel's function logs
    console.error('contact: Resend answered', r?.status ?? 'no response');
    return fail(502, 'send');
  }
  return Response.json({ ok: true });
}

