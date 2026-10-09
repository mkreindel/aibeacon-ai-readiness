# AI Readiness Diagnostic (AI Beacon)

Final project (TFM) for the Máster en Desarrollo con IA E.2 (BIG school).

## 1. Overview

AI Readiness Diagnostic is a web questionnaire for owners and managers of small and mid-sized businesses (1 to 200 employees) in Houston. Many of them do not know where to start with AI or what to automate first.

In about 5 minutes and without signing up, a visitor answers 15 questions across five areas (Data, Processes, Tools, Team and Governance). The app shows a maturity level from 1 to 3, a score per area and a short AI-written report with 3 suggested use cases. Each completed diagnostic is saved as a lead that AI Beacon consultants review in a private admin panel.

The full MVP specification is in [docs/spec.md](docs/spec.md).

## 2. Tech stack

Versions are the ones pinned in `package.json` and installed by `package-lock.json`.

| Area | Technology |
|---|---|
| Framework | Next.js 16.4.0 (App Router), React 19.3.0, TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Validation | zod 4.6 |
| Database and auth | Supabase (Postgres with Row Level Security, email and password auth) through `@supabase/supabase-js` 2.117 and `@supabase/ssr` 0.12 |
| AI report | OpenAI `gpt-5.4-mini` through the Vercel AI SDK (`ai` 7.0.116, `@ai-sdk/openai` 4.0.77) |
| Tests | Vitest 5, Testing Library, jsdom, PGlite (in-memory Postgres for migration, RLS and seed tests) |
| Linting | ESLint 9 with `eslint-config-next` |
| Hosting | Vercel |
| CI | GitHub Actions: lint, typecheck, tests, build and `npm audit --omit=dev` |

## 3. Local setup

### Requirements

- Node.js `^22.13.0` (see `engines` in `package.json`; `.nvmrc` pins major version 22).
- A Supabase project.
- An OpenAI API key (optional: without it, diagnostics are saved without the AI report).

### Install

```bash
npm install
cp .env.example .env.local
```

### Environment variables

Fill in `.env.local`. Never commit real values.

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Public by design. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_...`). Public by design; RLS protects the data. |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_...`). Server only: it bypasses RLS and is used only to save diagnostics. |
| `IP_HASH_SALT` | Random secret used to hash visitor IPs for the rate limit. Generate one with `openssl rand -hex 32`. |
| `OPENAI_API_KEY` | OpenAI API key for the AI report. Server only. Without it, the report is skipped. |

### Database

The repository has no Supabase CLI configuration; run the SQL files in the Supabase SQL Editor, in this order:

1. `supabase/migrations/20261008140000_diagnostics.sql`: tables, constraints, indexes and RLS policies.
2. In Supabase Auth, create the panel users (email and password) and disable public sign-ups.
3. Give each panel user a role (`admin` or `demo`):
   ```sql
   insert into public.panel_users (user_id, role) values ('<auth user id>', 'admin');
   ```
4. `supabase/seed/demo-data.sql`: 6 fictional demo diagnostics.
5. `supabase/seed/demo-reports.sql`: fictional AI reports for those 6 rows.

Both seed files are idempotent: running them again changes nothing.

### Run

```bash
npm run dev        # development server
npm test           # all tests (no Supabase or OpenAI needed)
npm run lint
npm run typecheck
npm run build
```

Tests never call OpenAI (the model is mocked) and test the SQL against an in-memory Postgres (PGlite), so they run without any external service.

## 4. Project structure

```
src/
  app/                  Pages and the API route (App Router)
    page.tsx            Landing
    diagnostic/         Public questionnaire
    api/diagnostics/    POST route: validate, rate-limit, score, AI report, save
    admin/              Admin panel: login, diagnostics list and detail
  components/           Questionnaire flow, score bars, AI report view, admin views
  lib/                  Scoring, questions, validation schemas, AI report prompt and schema
    server/             Server-only code: IP hashing, submission flow, Supabase and OpenAI clients
    admin/              Admin panel data access and session helpers
    supabase/           Supabase clients for server code and the proxy
  proxy.ts              Keeps the admin session fresh and redirects /admin paths
supabase/
  migrations/           Database schema and RLS policies
  seed/                 Fictional demo data and demo AI reports
  tests/                RLS and seed tests on PGlite
docs/
  spec.md               MVP specification (source of truth)
  adr/                  Architecture decision records
```

## 5. Main features

- **Questionnaire.** Company details (industry from a closed list, company size), then 15 questions, one area per screen with a progress bar, then contact details with a required consent checkbox. No login.
- **Score and level.** Deterministic: each area scores 0 to 100 and the overall score is their average. The level (1 to 3) depends on the overall score, and level 3 also needs a minimum Governance score. The server recalculates everything; it never trusts a score sent by the browser.
- **AI report.** A summary, exactly 3 suggested use cases (each with why, effort, risk and a first step) and one next step, written by OpenAI and validated with a zod schema. The model only receives industry, size, scores, level and answers, never the contact's name, email or company. If the model fails, times out or returns output that does not validate, the visitor still sees the level and scores with a notice, and the diagnostic is saved without a report.
- **Admin panel.** Email and password login at `/admin`. It lists diagnostics newest first and opens each one with contact details, scores, answers and the AI report. The panel is read-only and reads with the signed-in user's session, so RLS applies.
- **Read-only demo user.** A `demo` role that only sees rows marked as demo data (fictional companies and `@example.com` emails).
- **Rate limit.** 5 submissions per IP per hour; the next one gets HTTP 429. The IP is never stored in clear text, only as an HMAC-SHA256 hash with a secret salt.

Design decisions:

- [ADR 0001](docs/adr/0001-audit-braces-dev.md): accepting the `npm audit` alert on `braces` (development only).
- [ADR 0002](docs/adr/0002-cache-components-off.md): Cache Components turned off so missing diagnostics return a real 404.
- [ADR 0003](docs/adr/0003-client-ip-on-vercel.md): taking the visitor IP from `x-forwarded-for` on Vercel.
- [ADR 0004](docs/adr/0004-ai-report.md): AI report through the Vercel AI SDK and OpenAI, generated before saving.

Specification: [docs/spec.md](docs/spec.md).

## 6. Test user

| Field | Value |
|---|---|
| Email | `demo@example.com` |
| Password | `DEMO_PASSWORD_HERE` |

Sign in at `/admin` on the deployed app. The demo user can only read, and only sees the 6 fictional demo diagnostics; real submissions are hidden from it by RLS.

## 7. Links

- Deployed app: https://aibeacon-ai-readiness.vercel.app
- Slides: SLIDES_URL_HERE
- Video: VIDEO_URL_HERE

## Deployment

- Hosted on Vercel, connected to this GitHub repository.
- Set the environment variables from `.env.example` in Vercel for each environment that needs them (Preview, Production). Keep `SUPABASE_SECRET_KEY`, `IP_HASH_SALT` and `OPENAI_API_KEY` server only; never expose them with a `NEXT_PUBLIC_` prefix.
- The project runs on the Vercel Hobby plan, used for the demo only.

## License

MIT. See [LICENSE](LICENSE).
