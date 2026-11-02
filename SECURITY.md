# Security

Report vulnerabilities privately through GitHub private vulnerability reporting
if enabled. Otherwise open an issue asking for a private contact channel without
including vulnerability details or credentials.

This demo needs no service credentials. Optional database, admin, analytics,
mail, and AI features require your own infrastructure. A build never applies
schema changes. db:setup is a deliberate, separate operation. AI use can incur
provider charges. Never use production credentials or visitor data in examples.

Keep DATABASE_URL, ADMIN_PASSWORD_HASH, SESSION_SECRET, CRON_SECRET,
ANTHROPIC_API_KEY, and RESEND_API_KEY server-only. SESSION_SECRET must contain at
least 32 characters. Review rate limiting, retention, privacy notices, and host
configuration before enabling optional services. Do not enable AI publication
or analytics on a public demo with production accounts.
