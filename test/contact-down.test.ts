import { describe, expect, it, vi } from 'vitest';

// the rate limit's database is configured but doesn't answer
vi.mock('@/lib/db', () => ({ hasDb: true, db: () => ({ begin: () => Promise.reject(new Error('connection refused')) }) }));

describe('POST /api/contact when the rate limit store is down', () => {
  it('fails closed: 503 busy and no mail sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { POST } = await import('@/app/api/contact/route');
    const r = await POST(new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ana', email: 'ana@example.com', brief: 'A dashboard.' }),
    }));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ reason: 'busy' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

