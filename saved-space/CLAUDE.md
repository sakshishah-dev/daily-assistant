# Saved Space - project brief for Claude

Personal PWA for ONE user (Sakshi): "Instagram Saved, but you actually revisit it and work on it". Lives in `saved-space/` inside the daily-assistant repo (shares her Supabase project; tables prefixed `ss_`). It is separate from Daily Assistant code.

## Rules (never break)
- NO emojis and NO em dashes anywhere (app, docs, code strings). Icons are line icons (`ui/icon.ts`). English only for now.
- Cost 0 rupees: free tiers only. No secret keys in the Angular app: the browser holds ONLY the Supabase project address and the PUBLISHABLE key (`scripts/write-env.mjs` refuses `sb_secret_`; `npm run check:bundle` scans the build).
- Security is Row Level Security on every `ss_` table (`user_id = auth.uid()`, composite foreign keys keep rows inside one user). The .NET API holds no secret at all.
- Sakshi is new to coding. When she must act (dashboards, accounts, SQL): short overview (why + list), then ONLY Step 1 in detail, then wait for her reply. Never ask her to paste secrets. Simple language.
- Git: branch per phase, commit often, PR to main, ask her to merge, never force-push. Run all tests before every PR and report results honestly.

## Layout
- `web/` Angular 22 (standalone, signals, zoneless), PWA via @angular/service-worker. `src/app/core` (services, pure logic with tests), `pages/`, `ui/`. Data is loaded once into `StoreService` signals; changes show first, then save; a failed save reloads the truth.
- `api/` .NET 10: `SavedSpace.Core` (all logic: SSRF guard, safe fetcher, preview, token validator, rate limiter), `SavedSpace.Functions` (Azure Functions wrapper used on Static Web Apps), `SavedSpace.DevHost` (minimal API for local runs), `SavedSpace.Tests` (xUnit).
- `supabase/001_saved_space.sql` schema. `docs/SETUP.md` setup steps.
- Frontend sends the login token in header `X-Access-Token` (Static Web Apps replaces `Authorization`).

## Layout rules (same as Daily Assistant)
Fixed frame: `.app-shell` fixed, page scrolls in `.app-scroll`, tab bar `.bottom-nav` is a normal flex item BELOW it. Never `window.scrollTo`. Solid bars, `.save-bar` sticky inside the scroller. Long text wraps (auto-growing textareas via `ssAutogrow`, never one-line inputs for titles). Full month names via `formatDate`.

## Commands
```bash
cd saved-space/api && dotnet test
cd saved-space/web && npm test && npm run e2e && npm run build && npm run check:bundle
```
E2E uses an in-test fake of Supabase (`e2e/fake-supabase.ts`); locally in this cloud sandbox set `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
