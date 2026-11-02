import fs from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_DB, fakeNext } from './helpers';
import { eventToken, newViewer, TRACK_PER_IP, TRACK_TOTAL, VIEWER_COOKIE } from '@/lib/tracking';

const write = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { beta = { messages: { stream: () => ({ finalMessage: write }) } }; },
}));

describe.skipIf(!TEST_DB)('with a disposable Postgres database', () => {
  const sql = postgres(TEST_DB ?? '', { max: 5, onnotice: () => {} });
  let next: ReturnType<typeof fakeNext>;

  beforeAll(async () => {
    await sql.unsafe(await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
    // Reapplying migrations must preserve existing installations and remain safe.
    await sql.unsafe(await fs.readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  });
  afterAll(async () => { vi.unstubAllEnvs(); await sql.end(); });
  beforeEach(async () => {
    await sql`TRUNCATE contact_attempts, tracking_attempts, login_attempts, page_views, auto_post_runs, posts, settings, redirects RESTART IDENTITY CASCADE`;
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', TEST_DB!);
    vi.stubEnv('SESSION_SECRET', 'disposable-test-session-secret-1234567890');
    vi.doMock('@/lib/db', () => ({ hasDb: true, db: () => sql }));
    next = fakeNext('10.5.5.5');
  });

  const track = async (body: object, viewer?: string, ip = '10.5.5.5') => {
    next.jar.clear();
    if (viewer) next.jar.set(VIEWER_COOKIE, viewer);
    const { POST } = await import('@/app/api/track/route');
    return POST(new Request('https://dennypratama.com/api/track', {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Safari', 'x-real-ip': ip },
      body: JSON.stringify(body),
    }));
  };
  const views = async () => (await sql`SELECT count(*)::int AS n FROM page_views`)[0].n;

  it('contact: ten concurrent sends for the last slot admit exactly one', async () => {
    const { allowContact, TOTAL } = await import('@/lib/rateLimit');
    await sql`INSERT INTO contact_attempts (ip_hash) SELECT 'old-' || n FROM generate_series(1, ${TOTAL-1}) n`;
    const got = await Promise.all(Array.from({ length: 10 }, (_, i) => allowContact('new-' + i)));
    expect(got.filter(Boolean)).toHaveLength(1);
    expect((await sql`SELECT count(*)::int AS n FROM contact_attempts`)[0].n).toBe(TOTAL);
  });

  it('track: counts published posts/cases and rejects drafts and nonexistent slugs', async () => {
    await sql`INSERT INTO posts (slug,title,status,published_at) VALUES
      ('real-post','Real','published',now()-interval '1 day'), ('draft-post','Draft','draft',null)`;
    const viewer = newViewer();
    for (const body of [{page:'post',slug:'made-up'},{page:'post',slug:'draft-post'},{page:'case',slug:'made-up'}])
      expect((await track(body,viewer)).status).toBe(422);
    expect(await views()).toBe(0);
    expect((await (await track({page:'post',slug:'real-post'},viewer)).json()).token).toBeTruthy();
    expect((await (await track({page:'case',slug:'wordsburg'},viewer)).json()).id).toBeGreaterThan(0);
    expect(await views()).toBe(2);
  });

  it('track: a second browser on the same IP cannot complete an owner event', async () => {
    const owner = newViewer(), other = newViewer();
    const event = await (await track({page:'home'},owner)).json();
    await sql`UPDATE page_views SET viewed_at=now()-interval '60 seconds' WHERE id=${event.id}`;
    expect((await track({end:true,...event,duration:5000},other)).status).toBe(403);
    expect((await sql`SELECT time_on_page FROM page_views WHERE id=${event.id}`)[0].time_on_page).toBeNull();
    expect((await track({end:true,...event,id:event.id+1,duration:5000},owner)).status).toBe(403);
    // Cookie ownership survives a legitimate IP change.
    expect((await track({end:true,...event,duration:5000},owner,'10.6.6.6')).status).toBe(200);
    const duration=(await sql`SELECT time_on_page FROM page_views WHERE id=${event.id}`)[0].time_on_page;
    expect(duration).toBeGreaterThanOrEqual(60);expect(duration).toBeLessThanOrEqual(70);
  });

  it('track: simultaneous identical views create exactly one row', async () => {
    const owner=newViewer();
    const results=await Promise.all(Array.from({length:10},()=>track({page:'home'},owner)));
    const bodies=await Promise.all(results.map(r=>r.json()));
    expect(bodies.filter(b=>b.id)).toHaveLength(1);
    expect(bodies.filter(b=>b.skipped==='repeat')).toHaveLength(9);
    expect(await views()).toBe(1);
  });

  it('track: different browser cookies on the same IP retain separate events', async () => {
    await track({page:'home'},newViewer());await track({page:'home'},newViewer());
    expect(await views()).toBe(2);
  });

  it('track: concurrent requests cannot overshoot the last per-IP quota slot', async () => {
    const {ipHash}=await import('@/lib/visitor');
    const ip=ipHash(new Headers({'x-real-ip':'10.5.5.5'}));
    await sql`INSERT INTO tracking_attempts (ip_hash) SELECT ${ip} FROM generate_series(1,${TRACK_PER_IP-1})`;
    const owner=newViewer();
    const codes=(await Promise.all(Array.from({length:10},()=>track({page:'home'},owner)))).map(r=>r.status);
    expect(codes.filter(c=>c===200)).toHaveLength(1);expect(codes.filter(c=>c===429)).toHaveLength(9);
  });

  it('track: the global budget rejects writes even with a fresh visitor', async () => {
    await sql`INSERT INTO tracking_attempts (ip_hash) SELECT md5(n::text)||md5(n::text) FROM generate_series(1,${TRACK_TOTAL}) n`;
    expect((await track({page:'home'},newViewer())).status).toBe(429);
    expect(await views()).toBe(0);
  });

  it('track: a valid signature for a missing row does not create or update a view', async () => {
    const owner=newViewer();
    expect((await track({end:true,id:999,token:eventToken(999,owner),duration:20},owner)).status).toBe(200);
    expect(await views()).toBe(0);
  });

  it('login: concurrent guesses cannot bypass the five-check source budget', async () => {
    const auth=await import('@/lib/auth');
    vi.stubEnv('ADMIN_PASSWORD_HASH',(await auth.envLines('right horse battery')).split('\n')[0].split('=')[1]);
    const results=await Promise.all(Array.from({length:10},()=>auth.logIn('incorrect password')));
    expect(results.filter(r=>r?.includes('Too many'))).toHaveLength(5);
    expect((await sql`SELECT count(*)::int AS n FROM login_attempts`)[0].n).toBe(5);
  });

  it('login: widespread failures do not deny a correct login from a new browser', async () => {
    await sql`INSERT INTO login_attempts (ip_hash) SELECT 'elsewhere-'||n FROM generate_series(1,100) n`;
    const auth=await import('@/lib/auth');
    vi.stubEnv('ADMIN_PASSWORD_HASH',(await auth.envLines('right horse battery')).split('\n')[0].split('=')[1]);
    expect(await auth.logIn('right horse battery')).toBeNull();expect(await auth.isAdmin()).toBe(true);
  });

  it('auto-post: overlapping calls and a later replay of the same slot make one paid call', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY','test-not-a-real-key');
    write.mockReset().mockImplementation(async()=>{
      await new Promise(r=>setTimeout(r,150));
      const t=['Grids for efficient dashboards','Motion budgets on phones'][write.mock.calls.length-1] ?? 'A separate typography topic';
      return {stop_reason:'end_turn',content:[{type:'text',text:`===TITLE===\n${t}\n===SLUG===\n\n===EXCERPT===\nShort\n===BODY===\nBody\n===FAQ===\n\n===END===`}]};
    });
    vi.doMock('@/lib/revalidate',()=>({refreshBlog:()=>{}}));
    const {runAutoPost}=await import('@/lib/autopost');
    const [a,b]=await Promise.all([runAutoPost('daily:2026-10-24'),runAutoPost('daily:2026-10-24')]);
    expect(write).toHaveBeenCalledOnce();expect([a.ok,b.ok].filter(Boolean)).toHaveLength(1);
    await runAutoPost('daily:2026-10-24');expect(write).toHaveBeenCalledOnce();
    await runAutoPost();expect(write).toHaveBeenCalledTimes(2);
  });

  it('posts: listings omit bodies and a single lookup only returns a due published article', async () => {
    await sql`INSERT INTO posts (slug,title,status,published_at,body) VALUES
      ('due','Due','published',now()-interval '1 minute',${'word '.repeat(450)}),
      ('later','Later','published',now()+interval '1 day','future'),
      ('private','Private','draft',null,'secret')`;
    const {getPosts,getPost}=await import('@/lib/posts');
    const summaries=await getPosts();expect(summaries).toHaveLength(1);expect(summaries[0]).not.toHaveProperty('body');
    expect(summaries[0].minutes).toBe(2);
    expect((await getPost('due'))?.body).toContain('word');
    expect(await getPost('later')).toBeUndefined();expect(await getPost('private')).toBeUndefined();
    expect(await getPost('missing')).toBeUndefined();
  });
});

