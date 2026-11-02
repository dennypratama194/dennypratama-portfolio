-- The blog, its analytics and the admin. Applied idempotently by scripts/setup-db.mjs before each build.

CREATE TABLE IF NOT EXISTS posts (
  id           serial PRIMARY KEY,
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  excerpt      text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',          -- Markdown
  category     text NOT NULL DEFAULT 'UI/UX',
  faq          jsonb NOT NULL DEFAULT '[]',       -- [{ q, a }]
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,                       -- in the future = scheduled
  source       text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'import')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_live ON posts (status, published_at DESC);

-- a slug that was renamed or merged into another post keeps answering with a 301
CREATE TABLE IF NOT EXISTS redirects (
  from_slug  text PRIMARY KEY,
  to_slug    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_views (
  id           bigserial PRIMARY KEY,
  page_type    text NOT NULL,
  post_slug    text,
  ip_hash      char(64) NOT NULL,
  country      char(2),
  referrer     text,                              -- the external host the visitor came from
  viewed_at    timestamptz NOT NULL DEFAULT now(),
  time_on_page integer
);
CREATE INDEX IF NOT EXISTS page_views_at ON page_views (viewed_at);
CREATE INDEX IF NOT EXISTS page_views_dedupe ON page_views (ip_hash, viewed_at);
-- Keep historical analytics; new events are owned by a browser cookie rather than a shared IP.
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_hash char(64);
CREATE INDEX IF NOT EXISTS page_views_visitor ON page_views (visitor_hash, viewed_at);

CREATE TABLE IF NOT EXISTS tracking_attempts (
  ip_hash char(64) NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracking_attempts_at ON tracking_attempts (at);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash text NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_at ON login_attempts (at);

-- contact form sends, for its rate limit
CREATE TABLE IF NOT EXISTS contact_attempts (
  ip_hash text NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_attempts_at ON contact_attempts (at);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- one row per auto-post run, so the admin can show what happened and why
CREATE TABLE IF NOT EXISTS auto_post_runs (
  id         serial PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  ok         boolean,
  post_id    integer REFERENCES posts (id) ON DELETE SET NULL,
  message    text,
  raw        text                                 -- the model's output, kept when parsing fails
);
ALTER TABLE auto_post_runs ADD COLUMN IF NOT EXISTS slot text;
CREATE UNIQUE INDEX IF NOT EXISTS auto_post_runs_slot ON auto_post_runs (slot) WHERE slot IS NOT NULL;

