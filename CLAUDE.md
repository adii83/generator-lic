# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Shape

Small Vercel-style admin application with no frontend build pipeline:

- `index.html` contains all page markup, inline visual CSS, Tailwind CDN setup, and navigation sections.
- `assets/app.js` is one vanilla-browser JavaScript module for UI state, DOM rendering, events, downloads, and API calls.
- `api/*.js` are Node serverless handlers. Each exports a default `(req, res)` handler.
- Supabase REST is the persistence layer. No Supabase SDK is used.
- `nodemailer` is the only npm dependency and powers license email delivery.

## Commands

```bash
npm install
```

No `scripts` are defined in `package.json`; repository has no build, lint, test, typecheck, or single-test command. Frontend is served as static files, while `/api` requires a Vercel-compatible serverless runtime. When Vercel CLI is available, local development convention is:

```bash
npx vercel dev
```

Do not claim validation through `npm test`, `npm run build`, or `npm run lint` unless corresponding scripts are added first.

## Runtime Configuration

Serverless handlers depend on environment variables:

- `ADMIN_TOKEN` — compared with browser-supplied `X-Admin-Token` by `api/_auth.js`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — used by `api/_supabase.js` for direct PostgREST requests.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — required by `api/email.js`.
- `SMTP_PORT` defaults to `465`; `SMTP_SUBJECT` and `SMTP_FROM` are optional overrides.

## Architecture and Data Flow

### Browser

Navigation is section toggling, not URL routing. `activatePage()` in `assets/app.js` hides/shows `#page-*` sections and lazily loads dashboard stats, licenses, or logs.

`state` holds admin token, generated keys, and log pagination. Admin token persists under `GHUB_ADMIN_TOKEN` in browser `localStorage`. Every protected request flows through `apiFetch()`, which adds JSON headers and `X-Admin-Token`.

Generated keys exist only in browser memory after API response. TXT/CSV export is client-side. License and log tables/cards are rendered using DOM APIs and template strings.

### Serverless API

All handlers call `requireAdmin()` before work. Shared `sbFetch()` builds Supabase URLs, applies service-role headers, serializes request bodies, and returns raw response plus parsed JSON.

Endpoint responsibilities:

- `GET /api/stats` — derives active/unused/banned totals from license status rows.
- `GET /api/licenses` — loads up to 200 licenses, optionally searches key and notes.
- `POST /api/generate` — creates 1–200 cryptographically random `NXP-XXXX-XXXX-XXXX-XXXX` keys and inserts them sequentially.
- `POST /api/reset`, `/api/ban`, `/api/delete` — mutate one license selected by `license_key`.
- `GET /api/logs` — filters and paginates activation logs using Supabase `Content-Range` for totals. It intentionally tries both `activations_log` and legacy misspelling `activtions_log`.
- `POST /api/logs-clear` — deletes all rows from `activations_log`.
- `POST /api/email` — sends fixed NexaPlay license instructions through SMTP.

Expected Supabase data includes `licenses` fields such as `license_key`, `plan`, `status`, `notes`, `device_id`, and `activated_at`; activation logs expose fields such as `id`, `license_key`, `device_id`, `action`, `reason`, and timestamp variants.

## Change Boundaries

- Keep frontend changes in existing `index.html` and `assets/app.js` unless framework migration is explicitly requested; repository currently has no bundler or component system.
- Keep admin API calls behind `apiFetch()` so authentication and error parsing stay consistent.
- Keep Supabase access behind `api/_supabase.js`; handlers use PostgREST paths and query operators directly.
- Preserve both activation-log endpoint spellings in `api/logs.js` unless database migration confirms legacy fallback is unnecessary.
- `index.html` loads Tailwind from CDN and contains project-specific CSS; there is no generated Tailwind configuration.
