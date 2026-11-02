import { afterEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { adminCsp } from '@/lib/csp';
import { INTRO_SEEN_SCRIPT } from '@/lib/intro';
import { JSON_LD } from '@/lib/structuredData';

afterEach(() => vi.unstubAllEnvs());
it('admin scripts use a nonce and known inline hashes without unsafe-inline/eval in production',()=>{
  vi.stubEnv('NODE_ENV','production');
  const policy=adminCsp('audit-nonce');
  const script=policy.split('; ').find(s=>s.startsWith('script-src '))!;
  expect(script).toContain("'nonce-audit-nonce'");
  expect(script).not.toContain('unsafe-inline');expect(script).not.toContain('unsafe-eval');
  for(const text of [INTRO_SEEN_SCRIPT,JSON_LD]) expect(script).toContain(createHash('sha256').update(text).digest('base64'));
  expect(policy).toContain("script-src-attr 'none'");
});

