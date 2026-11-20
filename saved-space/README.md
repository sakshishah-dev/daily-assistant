# Saved Space

Instagram Saved, but you actually revisit it and work on it. Save a YouTube or Instagram link (or any web page) into a folder, see a preview, open it inside the app, add your own steps with tick marks, and mark the item done when you choose.

This is **Phase 1**. It is built for one person (Sakshi) but every row carries a `user_id` so it can grow later.

```
saved-space/
  web/                 Angular app (installable PWA)
  api/                 .NET 10: SavedSpace.Core (logic), .Functions (Azure), .DevHost (local), .Tests (xUnit)
  supabase/            001_saved_space.sql (tables + Row Level Security)
  docs/SETUP.md        One-time setup: database, hosting, phone
  CLAUDE.md            Notes for future Claude sessions
```

## What it does (Phase 1)

- Login with an email 6 digit code, session kept, logout. Invite only (same rule as Daily Assistant when you share its Supabase project).
- Folders: create, rename, delete, reorder with arrows. Suggested: Work, Gym, Food, Goals.
- Items: paste a link, title is filled from the preview (editable), optional note and due date, status Todo / Doing / Done. Lists show thumbnail, title, steps progress (2/5) and status.
- Item screen: YouTube plays in an embedded player (youtube-nocookie). Instagram tries the public embed and always shows an "Open in Instagram" button. Other links show the picture and an open button.
- Steps: add many in a row (return keeps the cursor in the box; paste a list and each line becomes a step), edit, reorder with arrows, tick, delete. The item is never marked done automatically; when every step is ticked the app only asks.
- Search plus folder and status filters. Today / This week view of items with a due date.
- PWA: install steps for iPhone and Android (More tab), offline app shell, safe-area aware fixed layout.

Not in Phase 1: photos, goals and vision board, sharing, notifications, links to Daily Assistant, other languages.

## How it fits together

```
Phone (Angular PWA)
  |-- email code login + all folders/items/steps  --> Supabase directly (publishable key, Row Level Security)
  |-- "give me a preview of this link"            --> /api/preview (.NET) --> YouTube oEmbed or the page's Open Graph tags
```

Only the preview needs a server, because a browser may not fetch other websites and must not be tricked into calling private addresses. The .NET API holds **no secret**: it checks the login token against Supabase's public keys.

### API safety (`api/SavedSpace.Core`)

- Login token required (`X-Access-Token`, or `Authorization: Bearer` locally). Asymmetric Supabase tokens are checked locally against the project's public key set; older shared-secret projects are checked by asking Supabase.
- SSRF protection: http/https only, ports 80 and 443 only, no user name in the link, every DNS answer must be a public address (private, loopback, link-local, cloud metadata, carrier NAT, multicast, reserved, IPv6 mapped forms are refused), the connection goes to the address that was checked (so DNS tricks cannot swap it), at most 3 redirects each checked again, 5 second timeout, 512 KB page cap, text content only, 20 previews per minute per user.
- No video is downloaded or stored. Preview text is cleaned (tags removed, 300 characters) and the app also escapes it.
- CORS: on Static Web Apps the app and `/api` share one address, so no cross-site access is granted. The local dev host only allows `http://localhost:4200`.

## Run it on your computer

Needs Node 22 and the .NET 10 SDK.

```bash
# 1. database: run supabase/001_saved_space.sql once (see docs/SETUP.md, Part 1)

# 2. API (terminal 1). Both values are public.
cd api
SUPABASE_URL=https://YOUR-PROJECT.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx dotnet run --project SavedSpace.DevHost

# 3. app (terminal 2). /api is proxied to the API on port 5080.
cd web
npm install
SS_SUPABASE_URL=https://YOUR-PROJECT.supabase.co SS_SUPABASE_KEY=sb_publishable_xxx npm run env
npm start            # http://localhost:4200
```

`npm run env` writes `src/app/core/env.generated.ts` (not committed). It refuses a `sb_secret_` key.

## Tests

```bash
cd api && dotnet test                              # xUnit: SSRF guard, link detection, preview parsing, token checks, rate limit
cd web && npm test                                 # Angular unit tests (link detection, dates, step logic)
cd web && npx playwright install chromium && npm run e2e   # smoke test of the main flow on a 390 x 844 phone screen
cd web && npm run build && npm run check:bundle    # production build, then scan it for secret keys
```

The Playwright test drives the real built app against an in-test stand-in for Supabase (`web/e2e/fake-supabase.ts`) and a stubbed preview call, so it needs no account and no internet. It does not prove that real YouTube or Instagram pages load; check those on your phone (docs/SETUP.md, Part 5).

## Hosting (free): Azure Static Web Apps

The app is static files and the API is a small Azure Function. Azure Static Web Apps (Free plan) hosts both at one address and runs the .NET API for you (runtime `dotnet-isolated:10.0`, set in `web/public/staticwebapp.config.json`). Free plan limits to know: 100 GB bandwidth a month (more than enough for one person; there is no overage billing, the site just stops serving past the limit), 500 MB storage, the API handles web requests only, and the first call after a quiet period can be a little slow. Creating the Azure account asks for a card for identity checks; the Free plan itself is not charged.

Why this and not Cloudflare Pages: one place, one address, the .NET API runs with no extra server to find or pay for. Cloudflare Pages is excellent for the app but cannot run .NET, so the API would need a second host, and free hosts for .NET either sleep for a minute when idle or need a card as well.

Deploy is automatic: merging a change under `saved-space/` to `main` runs `.github/workflows/saved-space-deploy.yml`. One-time setup is in `docs/SETUP.md`. Tests run on every pull request (`saved-space-ci.yml`).

## What I could not check from the build sandbox

- The deploy workflow and the Azure side (no Azure account here). The pieces it uses were built locally: the API publishes as a valid function app listing both functions, and the app builds.
- Azure Functions host start-up with the real Azure runtime (the same code was run through the local dev host instead).
- A real YouTube oEmbed call and real Instagram embeds (the sandbox has no direct internet). Without them the app still works: a YouTube link falls back to the standard thumbnail and you type the title; Instagram always has the open button.
- Instagram embeds can break or be blocked at any time. That is why the open button is always shown.

## Phase 2 needs (photos, notes, "done becomes a memory")

- **Photos:** a Supabase Storage bucket `ss-photos` (private) with policies on the first folder name = user id; table `ss_photos(id, user_id, item_id, storage_path, created_at)`; resize on the phone before upload to stay inside the free 1 GB; signed URLs to show them.
- **Notes:** the `note` column is plain text today. Decide plain or rich (Markdown is the simplest) and add a larger note screen; maybe a `ss_notes` table so one item can hold several.
- **"Done becomes a memory":** `done_at` already exists. Add a `memory_text` (what I learned or did) and a rating on the item, a Memories view sorted by `done_at`, and show photos attached when it was done. Decide whether done items hide from folders by default.
- **Later phases kept open by the schema:** `ss_goals` (and vision board images), shared folders via `ss_members(folder_id, user_id, role)` with RLS policies that check membership, and the Daily Assistant link (a reminder per step) which only needs `ss_subtasks.id` and a due time.
- Small cleanups worth doing then: offline writes queue, drag-free multi-select, per-folder colours and icon picker (columns already exist).
