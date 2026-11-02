import postgres from 'postgres';

/**
 * Postgres (Neon) holds the posts, page views and admin state. DATABASE_URL is the pooled connection string.
 * One small pool per server instance: serverless functions each get their own, so keep it tiny.
 */
const url = process.env.DATABASE_URL;
export const hasDb = !!url;

let client: postgres.Sql | null = null;
export function db() {
  if (!url) throw new Error('DATABASE_URL is not set');
  // prepare:false because Neon's pooler (PgBouncer, transaction mode) can't keep prepared statements
  // Neon's URL carries channel_binding, which postgres.js would send to the server as a setting it doesn't know
  const clean = new URL(url);
  clean.searchParams.delete('channel_binding');
  return (client ??= postgres(clean.toString(), { max: 3, idle_timeout: 20, connect_timeout: 15, prepare: false }));
}

