# Denny Pratama Portfolio

A runnable source demo of my portfolio: Next.js, TypeScript, GSAP, Lenis, and a
WebGL2 hero built without a 3D engine.

[Original website](https://dennypratama.com)

This release uses fresh Git history, placeholder artwork, example testimonials,
and sample blog posts. It contains no production database or credentials. It
preserves the implementation so you can study the motion, navigation, content
rendering, and optional admin architecture.

## Run locally

Requires Node.js 22+.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No database or paid API is required. The demo banner
and placeholder images deliberately distinguish this copy from the original site.

```bash
npm run verify
npm start
```

`verify` runs unit tests, TypeScript checks, and a production build. Database
integration cases skip unless TEST_DATABASE_URL points to a disposable
awards_test database. A local unit pass is not a database-integration pass.

## Architecture

- src/components/home: pinned hero, WebGL shader, work index, and motion sections.
- src/components/concept: interactive self-initiated concept previews.
- src/styles: CSS tokens, layouts, responsive styles, and animation variables.
- src/lib/posts.ts: local samples or optional Postgres-backed articles.
- src/app/admin: server-authenticated editorial dashboard.
- test: authentication, contact, tracking, request, and WebGL checks.

Reduced-motion and WebGL fallback paths are included. Client screenshots,
embedded client previews, production blog exports, migration/import utilities,
and internal release notes are excluded.

## Optional backend

The source includes Postgres-backed blog/admin, first-party analytics, contact
mail, and Anthropic article generation for architectural reference. These do
not connect to the author's services. Configure your own infrastructure to use
them; analytics is opt-in via NEXT_PUBLIC_ENABLE_ANALYTICS=true. The demo
contact address is hello@example.com. Replace it before testing contact exports.

A normal build never changes a database. For a fresh disposable database only:

```bash
npm run db:setup
```

Read db/schema.sql first. DATABASE_URL targets that database; db:setup applies
the schema and inserts the included sample as a draft. Generate admin environment
values using /admin/setup, then store them privately. Never commit the output.
No cron schedule is included. AI generation stays off until configured and
explicitly enabled. Provider usage can cost money.

To run database checks:

```bash
TEST_DATABASE_URL=postgres://postgres:local_test_only@localhost:5432/awards_test npm run test:db
```

CI uses a disposable Postgres service. No live site or production database is
part of the workflow. Before deployment, replace branding, project descriptions,
metadata, sample statistics, domain, email, and artwork. The original author's
career statistics and project descriptions are not claims about your fork.

## License

Original implementation code and generated placeholders: MIT © 2026 Denny Pratama.
Personal branding and editorial/project content are excluded; see ASSETS.md.
See CONTRIBUTING.md and SECURITY.md for contributions and vulnerability reports.
