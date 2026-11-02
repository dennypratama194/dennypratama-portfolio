import { createHash } from 'node:crypto';

// Vercel sets x-real-ip and x-forwarded-for itself, so a visitor can't spoof them
export const clientIp = (h: Headers) => h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0';

// same pepper and algorithm as the old site, so imported history and new visits count as the same visitors
export const ipHash = (h: Headers) => createHash('sha256').update(clientIp(h) + 'dp-portfolio-pepper-2026').digest('hex');

const BOTS = /bot|crawl|spider|slurp|facebook|twitter|whatsapp|telegram|curl|wget|python|go-http|dataforseo|bingpreview|googleweblight|lighthouse|headlesschrome|vercel-screenshot/i;
export const isBot = (h: Headers) => { const ua = h.get('user-agent'); return !ua || BOTS.test(ua); };

