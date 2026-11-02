import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';

// Ubuntu GitHub-hosted runners include Chrome. Test an actual browser enforcing the production CSP,
// without downloading a browser or changing application dependencies.
const profile = await mkdtemp(path.join(tmpdir(), 'awards-csp-'));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3102'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
let serverLog = '';
server.stdout.on('data', b => { serverLog += b; });
server.stderr.on('data', b => { serverLog += b; });
const upstream = 'http://127.0.0.1:3102';
const relay = http.createServer(async (req, res) => {
  try {
    const response = await fetch(upstream + (req.url ?? '/'));
    const headers = Object.fromEntries(response.headers);
    delete headers['content-length']; delete headers['content-encoding']; delete headers['transfer-encoding'];
    let body = Buffer.from(await response.arrayBuffer());
    if (req.url === '/admin/login') {
      const policy = response.headers.get('content-security-policy') ?? '';
      const scriptPolicy = policy.split('; ').find(x => x.startsWith('script-src ')) ?? '';
      assert(!scriptPolicy.includes('unsafe-inline'));
      const nonce = scriptPolicy.match(/'nonce-([^']+)'/)?.[1];
      assert(nonce, 'admin response must contain a nonce');
      // The trusted marker proves scripts execute; the untrusted marker must remain blocked by Chrome.
      const injection = `<script>document.documentElement.dataset.auditUntrusted='ran'</script><script nonce="${nonce}">document.documentElement.dataset.auditTrusted='ran'</script>`;
      body = Buffer.from(body.toString().replace('</head>', injection + '</head>'));
    }
    res.writeHead(response.status, headers); res.end(body);
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});

try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(upstream + '/admin/login')).ok; if (ready) break; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'application failed to start: ' + serverLog);
  await new Promise(resolve => relay.listen(0, '127.0.0.1', resolve));
  const address = relay.address();
  assert(address && typeof address !== 'string');
  const { stdout } = await promisify(execFile)(process.env.CHROME_BIN ?? 'google-chrome', [
    '--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-background-networking',
    '--user-data-dir=' + profile, '--dump-dom', '--virtual-time-budget=2000',
    `http://127.0.0.1:${address.port}/admin/login`,
  ], { timeout: 20000, maxBuffer: 2 * 1024 * 1024 });
  assert(stdout.includes('data-audit-trusted="ran"'), 'Chrome did not execute the explicitly trusted nonce script');
  assert(!stdout.includes('data-audit-untrusted="ran"'), 'Chrome executed an unauthorized inline script');
  assert(stdout.includes('name="password"'), 'admin login did not render');
  const first = (await fetch(upstream + '/admin/login')).headers.get('content-security-policy');
  const second = (await fetch(upstream + '/admin/login')).headers.get('content-security-policy');
  assert.notEqual(first, second, 'nonce must change per request');
  assert(!(await fetch(upstream + '/')).headers.get('content-security-policy')?.includes("'nonce-"), 'public pages must retain static caching');
  console.log('Chrome verified: trusted nonce executes, injected inline script blocked, fresh nonce per request, public static policy preserved.');
} finally {
  relay.closeAllConnections(); relay.close(); server.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}

