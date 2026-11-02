/**
 * The public APIs (contact, track) take small JSON bodies from this site's own pages only. readJson reads at most
 * `max` bytes off the stream, whatever Content-Length claims, and only parses a JSON body sent from this origin.
 * A foreign Origin is refused; a missing one (curl, older beacons) is let through, since the rate limits handle
 * scripts and a browser always sends Origin on a cross-site POST.
 */
export type Read = { ok: true; body: unknown } | { ok: false; status: 400 | 403 | 413 | 415 };

export function sameOrigin(req: Request) {
  const o = req.headers.get('origin');
  if (!o) return true;
  try {
    return new URL(o).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function readJson(req: Request, max: number): Promise<Read> {
  if (!sameOrigin(req)) return { ok: false, status: 403 };
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return { ok: false, status: 415 };
  if (Number(req.headers.get('content-length') ?? 0) > max) return { ok: false, status: 413 };
  if (!req.body) return { ok: false, status: 400 };

  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413 };
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.byteLength; }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400 };
  }
}

