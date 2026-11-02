import { describe, expect, it } from 'vitest';
import { readJson } from '@/lib/request';

// a body streamed in chunks, so no Content-Length is sent
const streamed = (text: string, headers: Record<string, string> = { 'content-type': 'application/json' }) => {
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(c) { for (let i = 0; i < bytes.length; i += 1000) c.enqueue(bytes.slice(i, i + 1000)); c.close(); },
  });
  return new Request('https://dennypratama.com/api/x', { method: 'POST', headers, body, duplex: 'half' } as RequestInit);
};

describe('readJson', () => {
  it('parses a small JSON body', async () => {
    expect(await readJson(streamed('{"a":1}'), 100)).toEqual({ ok: true, body: { a: 1 } });
  });

  it('stops at the byte cap even without Content-Length', async () => {
    const r = await readJson(streamed(JSON.stringify({ pad: 'x'.repeat(25_000) })), 20_000);
    expect(r).toEqual({ ok: false, status: 413 });
  });

  it('refuses a declared size over the cap before reading', async () => {
    const req = new Request('https://dennypratama.com/api/x', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '50000' }, body: '{}' });
    expect(await readJson(req, 20_000)).toEqual({ ok: false, status: 413 });
  });

  it('only takes JSON', async () => {
    expect(await readJson(streamed('{"a":1}', { 'content-type': 'text/plain' }), 100)).toEqual({ ok: false, status: 415 });
  });

  it('refuses another site, allows this one and requests with no Origin', async () => {
    const at = (origin: string) => streamed('{}', { 'content-type': 'application/json', origin });
    expect(await readJson(at('https://evil.test'), 100)).toEqual({ ok: false, status: 403 });
    expect(await readJson(at('http://dennypratama.com'), 100)).toEqual({ ok: false, status: 403 });
    expect((await readJson(at('https://dennypratama.com'), 100)).ok).toBe(true);
    expect((await readJson(streamed('{}'), 100)).ok).toBe(true);
  });

  it('answers 400 for broken JSON', async () => {
    expect(await readJson(streamed('{nope'), 100)).toEqual({ ok: false, status: 400 });
  });
});

