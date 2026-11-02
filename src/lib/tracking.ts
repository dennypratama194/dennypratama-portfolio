import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const VIEWER_COOKIE = 'dp_viewer';
export const EVENT_SECONDS = 2 * 3600;
export const TRACK_PER_IP = 60;
export const TRACK_TOTAL = 1000;

const key = () => process.env.SESSION_SECRET ?? '';
export const trackingConfigured = () => key().length >= 32;
export const validViewer = (s: string) => /^[A-Za-z0-9_-]{32}$/.test(s);
export const newViewer = () => randomBytes(24).toString('base64url');
const mac = (s: string) => createHmac('sha256', key()).update(s).digest('base64url');
export const viewerHash = (viewer: string) => createHmac('sha256', key()).update(`viewer:${viewer}`).digest('hex');

/** A view ID is public; only this browser's HttpOnly cookie and signed token may complete that view. */
export function eventToken(id: number, viewer: string, now = Date.now()) {
  const payload = `1.${id}.${Math.floor(now / 1000) + EVENT_SECONDS}`;
  return `${payload}.${mac(`${payload}.${viewer}`)}`;
}

export function validEvent(token: unknown, id: number, viewer: string, now = Date.now()) {
  if (!trackingConfigured() || !validViewer(viewer) || typeof token !== 'string' || token.length > 150) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== '1' || parts[1] !== String(id)) return false;
  const expiry = Number(parts[2]);
  const seconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(expiry) || expiry < seconds || expiry > seconds + EVENT_SECONDS) return false;
  const expected = Buffer.from(mac(`${parts.slice(0, 3).join('.')}.${viewer}`));
  const signature = Buffer.from(parts[3]);
  return signature.length === expected.length && timingSafeEqual(signature, expected);
}

