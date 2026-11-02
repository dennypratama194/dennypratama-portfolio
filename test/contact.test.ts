import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// no database in the tests: the rate limit counts in memory
vi.mock('@/lib/db', () => ({ hasDb: false, db: () => { throw new Error('no db'); } }));

const good = { name: 'Ana', email: 'ana@example.com', brief: 'A dashboard for wind farms.', need: ['Website design', 'Hacked'], when: 'Just exploring' };
let n = 0;
// each test posts from its own address so the per-address limit doesn't carry over
const post = (body: unknown, ip = `10.0.0.${++n}`) =>
  new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

async function load() {
  vi.resetModules();
  return (await import('@/app/api/contact/route')).POST;
}

describe('POST /api/contact', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('CONTACT_TO', 'inbox@example.com');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('sends a valid brief through Resend', async () => {
    const POST = await load();
    const r = await POST(post(good));
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const mail = JSON.parse(init.body);
    expect(mail.to).toEqual(['inbox@example.com']);
    expect(mail.reply_to).toBe('ana@example.com');
    // chips only take the values the form offers
    expect(mail.text).toContain('Needs: Website design');
    expect(mail.text).not.toContain('Hacked');
  });

  it('rejects bodies that are not a JSON object', async () => {
    const POST = await load();
    expect((await POST(post('nope'))).status).toBe(400);
    expect((await POST(post([1, 2]))).status).toBe(400);
  });

  it('names the fields that need fixing', async () => {
    const POST = await load();
    const r = await POST(post({ name: '', email: 'not-an-email', brief: '' }));
    expect(r.status).toBe(422);
    expect(await r.json()).toMatchObject({ reason: 'invalid', fields: ['name', 'email', 'brief'] });
    expect((await POST(post({ ...good, brief: 'x'.repeat(5001) }))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps line breaks out of the subject', async () => {
    const POST = await load();
    await POST(post({ ...good, name: 'Ana\r\nBcc: x@evil.test' }));
    const mail = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(mail.subject).toBe('New brief from Ana Bcc: x@evil.test');
  });

  it('pretends to accept a filled honeypot without sending', async () => {
    const POST = await load();
    const r = await POST(post({ ...good, website: 'http://spam.test' }));
    expect(r.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limits one address to 5 sends an hour', async () => {
    const POST = await load();
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await POST(post(good, '10.9.9.9'))).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('answers 503 when mail is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const POST = await load();
    const r = await POST(post(good));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ reason: 'unconfigured' });
  });

  it('answers 502 when Resend refuses, without leaking the key', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"bad"}', { status: 403 }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const POST = await load();
    const r = await POST(post(good));
    expect(r.status).toBe(502);
    expect(JSON.stringify(await r.json())).not.toContain('re_test');
    expect(JSON.stringify(err.mock.calls)).not.toContain('re_test');
  });

  it('sends nothing for a padded body with no Content-Length', async () => {
    const POST = await load();
    const text = JSON.stringify({ ...good, pad: 'x'.repeat(25_000) });
    const body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } });
    const r = await POST(new Request('http://localhost/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': '10.7.7.7' }, body, duplex: 'half' } as RequestInit));
    expect(r.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends nothing for a text/plain post from another site', async () => {
    const POST = await load();
    const r = await POST(new Request('http://localhost/api/contact', { method: 'POST', headers: { 'content-type': 'text/plain', origin: 'https://evil.test' }, body: JSON.stringify(good) }));
    expect(r.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

