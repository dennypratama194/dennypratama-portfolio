import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventToken, EVENT_SECONDS, newViewer, validEvent, viewerHash } from '@/lib/tracking';

describe('signed analytics events', () => {
  beforeEach(() => vi.stubEnv('SESSION_SECRET', 's'.repeat(40)));
  afterEach(() => vi.unstubAllEnvs());

  it('only accepts the matching event and browser cookie, including on a shared IP', () => {
    const owner = newViewer(), other = newViewer();
    const token = eventToken(42, owner);
    expect(validEvent(token, 42, owner)).toBe(true);
    expect(validEvent(token, 43, owner)).toBe(false);
    expect(validEvent(token, 42, other)).toBe(false);
    expect(validEvent(token, 42, '')).toBe(false);
    expect(validEvent(token.slice(0,-1)+'!', 42, owner)).toBe(false);
    expect(viewerHash(owner)).not.toBe(viewerHash(other));
  });

  it('expires and is invalidated by a secret rotation', () => {
    const owner = newViewer(), now = 1_800_000_000_000;
    const token = eventToken(42, owner, now);
    expect(validEvent(token,42,owner,now + EVENT_SECONDS*1000 + 1000)).toBe(false);
    vi.stubEnv('SESSION_SECRET','different-key-'.repeat(4));
    expect(validEvent(token,42,owner,now)).toBe(false);
  });

  it('does not accept signatures with malformed or far-future expiries', () => {
    const owner = newViewer();
    expect(validEvent('1.42.NaN.bad',42,owner)).toBe(false);
    expect(validEvent('1.42.999999999999.bad',42,owner)).toBe(false);
    vi.stubEnv('SESSION_SECRET','');
    expect(validEvent(eventToken(42,owner),42,owner)).toBe(false);
  });
});

