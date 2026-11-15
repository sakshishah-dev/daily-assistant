# Daily Assistant - Project Brief for Claude

PWA: medicine reminders + habit tracker + routines, built for Sakshi (sakshi@gearedfinance.com.au), installed on iPhone via Safari > Share > Add to Home Screen.
Roadmap: Sakshi only (now) > 10-20 friends/family > ~100 people > public. Free tiers only (cost 0 INR; a domain ~1,000 INR/yr is the only acceptable spend), India only (timezone stored per user, default Asia/Kolkata), stays a PWA, no ads/trackers. New feature ideas go to Sakshi to decide; build foundations before features.

## How to work with Sakshi (always follow)
- She is new to this. When a task needs her action (dashboards, settings, SQL): first a short overview (why + one line per step), then ONLY Step 1 in detail (exact clicks, what she should see), then wait for her reply and give the next step.
- Never ask her to paste secrets (passwords, service_role key, app passwords).
- Simple language; explain unfamiliar terms briefly.
- Git: start from latest origin/main on a new branch, never force-push, commit, push, open a PR to main, ask her to merge. After a SQL migration is needed, give the steps as above. If there is no GitHub access in the session, give her a prefilled compare link (`.../compare/main...<branch>?quick_pull=1&title=...&body=...`).

## Rules (never break)
- Security: no secret keys in frontend code; medicine and routine data stay private; RLS on every user table. Frontend gets ONLY the publishable key, backend ONLY the secret key.
- Medicine safety: the app never recommends medicines or doses or makes medical decisions; it only reminds per the schedule the user entered. Templates set the pattern only, never a name or dose.
- Tone: NO emojis and NO em dashes anywhere (app, notifications, messages, docs, code strings). Use `.` `:` `,` `-` `;`. Icons are lucide-react line icons (`CategoryIcon`, `NOTIFICATION_SLOTS[slot].icon`).
- Languages (English / Hindi / Gujarati): `lib/i18n.ts`, English text is the key: `t('Text {n}', {n})`. Every new user-facing string uses t() and needs entries in `locales/hi.ts` + `locales/gu.ts` (keep `{placeholders}` and `**bold**`; target 0 missing and 0 unused keys; a scan = collect t('...') literals and compare to dictionary keys). Server notification strings go in `api/_lib/i18n.js` (`tr(lang, ...)`, pass `lang` to every builder; family alerts use the FOLLOWER's language). `t` clashes with callback params named `t`: import as `tr`. Never translate medicine names or user text (including routine names). Times use `timeOf()`, dates in sentences use `month: shortMonth()` (full month name in hi/gu); never call toLocaleString/toLocaleTimeString directly. Hindi/Gujarati need extra line-height (index.css) and Noto Sans Gujarati (size-adjust 116%); check layout in both. The doctor report has its own language (`tIn`, `da_report_lang`). Chosen on first open (LanguageChooser, skipped when `navigator.webdriver`), changed in Settings; stored in localStorage `da_lang` and `profiles.language`.
- Feature guide: every new feature adds an entry to `frontend/src/data/features.ts` (title, what, where, check, added). `/guide` is public.
- Demo mode: any new server call must handle `isDemo()` (lib/demo.ts).
- Loading states: never show an empty/"nothing here" screen while data is arriving. AppContext `fresh` = server data loaded (or failed); screens use skeletons (`components/ui/Skeleton.tsx`) until then; check-in, refill, edit and report wait for `fresh`.
- Layout: the signed-in app is a FIXED FRAME (`.app-shell` fixed, `html.shell-locked`): the page scrolls inside `.app-scroll` and the tab bar (`.bottom-nav`, solid) sits BELOW it as a normal flex item, so it can never float and rubber-band scrolling never shows the background. Never use `window.scrollTo`/document scroll in the signed-in app (use `scrollIntoView` or scroll `.app-scroll`; it resets to top on route change in MainApp). Print CSS unlocks the frame. Logged-out pages (Login, About, Privacy) use normal document scroll. Sub-pages use `<div className="page pt-4">` + `<div className="page-header">` (back `btn-icon` with ArrowLeft 20 + `page-title`); tab pages use `page pt-6`. Forms hide the tab bar via `HIDE_ON` in BottomNav. Bottom save buttons use the shared `.save-bar` class (sticky bottom-0, solid, top divider, safe-area padding; sits above the tab bar automatically). Long user text must wrap (`break-words`), never scroll sideways or clip.

## Tech stack
React 18 + TypeScript + Vite + Tailwind; vite-plugin-pwa (injectManifest, custom `sw.ts`); React Router v6; Supabase (Postgres + RLS + Auth: 6-digit email OTP, invite-only via `allowed_emails`, SMTP through a Gmail app password); backend = Vercel serverless functions in `frontend/api/*` (Node 22) on the same origin as the app; web-push + VAPID; scheduler = Supabase pg_cron + pg_net calling POST /api/cron/tick every minute (Bearer CRON_SECRET from Vault). Hosting free (Vercel + Supabase). Railway was retired 9 Nov 2026 (docs/MOVE-OFF-RAILWAY.md is history only).

## Project structure
```
daily-assistant/
  frontend/              React PWA (Vercel Root Directory)
    src/pages/           Home(Today), Reminders, AddReminder, RoutineEditor, CheckIn, Refill, WaterSetup/WaterAdd, Tasks/TasksWeek/ManageTasks,
                         Progress, Report, Settings, Setup, Guide, About, Invites, Family*, Login, Welcome, Privacy, Feedback
    src/components/      ui/ (ProgressRing, EmptyState, Celebration, Skeleton, ConfirmDialog), RemindAgainField, WaterCard, FamilyTodayCard, ...
    src/context/         AuthContext (session), AppContext (per-user data + sync engine)
    src/lib/             supabase, sync (row mapping, diff, merge, upsertReminderRows), routines, snooze, demo, i18n, family, tasks, water, admin, api
    src/utils/           constants, dateHelpers, schedule (stock/course/SOS), dose
    src/data/            features.ts, initialData.ts (legacy import only)
    api/                 Vercel functions: push/test, account/delete, cron/tick, health; _lib/ (scheduler, scheduleLogic, i18n, supabaseAdmin, http)
    test/                schedule.test.ts (app logic), scheduleLogic.test.mjs (scheduler logic)
    scripts/dev-api.mjs  local stand-in for the Vercel functions (vite proxies /api to :3001)
  backend/supabase/      phase6-schema.sql (full idempotent schema) + migrations/
  docs/                  SETUP-PHASE6.md (Supabase/Gmail/Vercel setup + admin), MOVE-OFF-RAILWAY.md (history + cron steps)
```

## Key design decisions
- **Slots and catch-up**: 4 notification slots (morning, afternoon, after_dinner, overall; times configurable per user). Each scheduler tick checks now + the 5 minutes before (`recentTimes`, never across midnight) so a late tick still delivers; claims in `notification_log` (user, date, key) stop doubles; at most one repeat per check-in per tick and none on top of a first send in the same tick; water sends only the latest due time; older than 5 min is skipped.
- **Custom-time reminders** (`customTime`, no slots): pushed by the scheduler (claim `custom:<reminderId>`), dose log id `<reminderId>__custom__<date>`. Dose log ids otherwise `<reminderId>__<slot>__<date>` (deterministic, safe across devices).
- **Routines** (migration 2026-11-16-routines.sql): a named group with its OWN time and repeat days, ONE notification and one check-in. NOT a table: a set of normal exact-time reminders (slots [], customTime = routine time, same repeat/isActive/remindAgain) sharing `routine_id` + `routine_name` + `routine_order`. Dose logs unchanged, so scores, stock, reports, family sharing need no change; only GROUPING differs, always by key `routine-<routineId>`: Today group (`lib/routines.ts`), `/checkin/routine-<id>`, snooze key, scheduler (`dueRoutines`, `routinePending`, `buildRoutineNotification|FollowUp|Snooze`; claim `routine:<id>`, tag `da-routine-<id>`, repeats `again:routine-<id>:<offset>`, family alert `care:<link>:routine-<id>` lists only its medicines). `dueCustom` skips routine items. Screens `/routines/add`, `/routines/edit/:id` (RoutineEditor: name, time, repeat, items with up/down arrows and a wrapping textarea title, remind again, pause, delete; the item form scrolls into view and focuses when opened). Reminders tab has "Add routine" and one card per routine. Save replaces all members in one `setReminders`. A medicine inside a routine opens the normal edit form for stock/course; its time, days, SOS and remind-again are hidden there (the routine owns them). Own account only (followers see its medicines as single medicines). If the migration is not run, sync saves rows without the routine columns (`upsertReminderRows`) and snoozing a routine fails.
- **Check-in** (`/checkin/<slot>`, `custom-<id>`, `routine-<id>`): ticked = completed, unticked = `skipped` + `skippedReason: 'missed'` (counts as NOT done; deliberate skips stay excused: isExcused/isMissed).
- **Remind me again** (per reminder, alarm style): `reminders.remind_again = {every 0|5|10|15|30, times 1..3}`; NULL = profile `follow_up_minutes` (0/15/30/60) as one repeat. `repeatsDue()` groups per check-in key, claim `again:<key>:<offset>`; stops when done, checked in, snoozed or after a snooze fired (`nomore:<key>`). Sync retries without the column if the migration is missing.
- **Snooze** (10/30/60 min on check-in): `snoozes` table, one per user+key, max 3 h, DB trigger sets created_at. The scheduler takes due rows with delete...returning, sends only if still pending; future snoozes suppress repeats.
- **Stock**: `medicine.stock = {quantity, unit, perDose, refilledAt, lowDays}`; remaining is DERIVED = quantity - perDose x completed doses since refilledAt. Editing "You have now" = new refill point. No alert if the course ends first or paused/finished. Today banner + a push every day at the user's morning time while low/out (`stock:<id>`). Refill screen `/refill/:id`.
- **Course**: `medicine.startDate/endDate` (inclusive), honoured by `shouldReminderRunToday` and `runsOn`.
- **As-needed (SOS)** medicines: `medicine.asNeeded`, never scheduled; Today "Only when needed" > "Took one" logs `<rid>__sos__<date>__<stamp>`; `isSos()` keeps them out of scores/weekly/report; `allLogs` (with SOS) feeds stock (lowDays = doses left).
- **Holiday mode**: `profiles.paused_until` (inclusive, max 60 days). Nothing is due (so nothing is missed) and the scheduler skips the user entirely.
- **Water**: own screen `/water`, not a reminder. `profiles.water = {on, every 30|60|120|180, from, to, goal}`; glasses in `water_logs` via RPC `add_water(date, +-1)`; scheduler at from+every..to (`water:<HH:MM>`), stops at goal. Not in scores or badge.
- **Fix past days** (Progress > Calendar): `dayInstances(date)` + `setDayStatus`, last 60 days; past "Taken" is stamped at the scheduled time (stock stays right).
- **Sunday summary**: Sunday at the user's night time, push "Your week: N% done" + most-missed pattern (`weeklySummary`); claim `weekly:<date>`.
- **Doctor report** `/report`: 7/30/90 days, per-medicine taken/missed/%, SOS doses, disclaimer; made on the phone via window.print(), nothing sent.
- **Family** (migration 2026-11-14-family.sql): `care_links` (owner_id takes medicines, carer_id follows, status pending|active|ended, can_manage, alert_after, 8-char code, 7-day expiry); RPCs `care_create_invite`, `care_invite_preview`, `care_accept`, `care_end`, `care_update`, `care_people`. RLS: followers READ only `category='medicine'` reminders and dose logs (`follows()`); `manages()` adds insert/update/delete of medicines. **Own-data queries must filter `.eq('user_id', uid)`.** Screens /family, /family/add, /family/join/:code, /family/:linkId, add/edit via AddReminder with `familyMode`. `checkFamily()`: "hasn't marked" push at dose time + alert_after (claim `care:<link>:<key>`), low stock at the owner's morning time (`care-stock:<link>:<rid>`).
- **Invites from the app** (owner only): `profiles.is_admin` (set by migration, NOT in the update grant); Settings > Invite people uses admin RPCs that check `is_admin()`; WhatsApp message includes install steps (`lib/installText.ts`).
- **Feedback and errors by email**: each tick emails new `feedback` rows (claim `feedback:<id>`); `lib/errorReport.ts` sends client errors to `client_errors`, and ONE grouped email per hour (claim `errors:<hour>`), rows deleted after 14 days. Both via Gmail SMTP (nodemailer) to FEEDBACK_EMAIL_TO.
- **Demo mode**: "Try the demo" (Login, About, Guide) sets `da_demo_v1` and seeds sample data (Priya, a Morning routine, family Maa/Rohan) in localStorage `da_demo_*`; no request reaches the server; push, feedback, invites, delete account are disabled.
- **Setup guide** `/setup` (install > notifications > test; iPhone push needs the Home Screen app) and public `/about`.
- **Data/sync**: Supabase is the source of truth. AppContext keeps `data` (UI) and `synced`; a debounced flush upserts the diff and retries offline; cached in localStorage `da_cache_v3_<uid>`. Legacy pre-account keys (`da_reminders_v2`, `da_logs_v2`, `da_settings_v2`, `da_device_id`) are imported once on first login (or Settings > Import) and archived to `da_legacy_backup_v2`.
- **App icon badge**: push `badge` = pending items whose time has come; the app recomputes every minute. **App updates**: sw.ts skipWaiting + clientsClaim; main.tsx checks on every open and reloads once.
- **Tasks tab**: daily checklist with Submit Day (`daily_tasks`, `task_logs`, RPC `submit_day`), weekly grid, Manage screen (reorder with arrows; HTML5 drag does not work on iOS).
- **Repeat formats**: weekly `repeat: 'weekly', repeatDays: [3]` (0=Mon..6=Sun); monthly `repeatDays: [1,15]`; twice daily = one reminder with two slots.
- **No home-screen widgets** (needs a native app, 99 USD/yr). iOS web push has no action buttons. Avoid storing prescription photos.

## Live URLs and deployment
- App https://daily-assistant-eta.vercel.app, health https://daily-assistant-eta.vercel.app/api/health, GitHub github.com/sakshishah-dev/daily-assistant.
- Vercel server env (never VITE_): SUPABASE_URL, SUPABASE_SERVICE_KEY (sb_secret_), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL, CRON_SECRET, SMTP_USER, SMTP_PASS, FEEDBACK_EMAIL_TO. Browser env: VITE_VAPID_PUBLIC_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (= publishable sb_publishable_ key). vercel.json SPA rewrite excludes /api/*. With a publishable key on the server RLS silently hides all rows and nothing is sent.
- Supabase project iiyeyisdmafernjjxkzu.supabase.co; schema `backend/supabase/phase6-schema.sql` (idempotent); setup in docs/SETUP-PHASE6.md. Invite fallback SQL: `insert into allowed_emails (email, note) values ('x@gmail.com', 'who');` (lowercase). Owners: sakshi@gearedfinance.com.au, sakshishah5704@gmail.com. Feedback: Table Editor > feedback.
- Migrations run in prod: follow-up, snooze, cron-1+2, remind-again, family. To confirm: water, holiday-mode, invites-and-errors, language, 2026-11-16-routines.
- Public VAPID key: BBox61hXVL7ChfkcJPzE-uJw7D3MKzNxC6kKo42Qg0ptRRJCzv4ZXU5tyMwTZEbudi26mGWUmSRgvNDOYkG3ChI (private key only in Vercel).

## Running locally
```bash
cd frontend
npm run dev                 # app on :5173 (proxies /api to :3001)
node scripts/dev-api.mjs    # API functions on :3001 (needs the server env vars)
npx tsc --noEmit -p . && npm test && npm run test:api && npx vite build
```
`npm test` writes to /tmp and fails on Windows: run `npx esbuild test/schedule.test.ts --bundle --platform=node --outfile=<any dir>/t.cjs && node <any dir>/t.cjs`. For browser checks use the dev server and "Try the demo" (390x844; English, Hindi, Gujarati). pg_cron check (SQL): `select status_code, left(content::text,60), created from net._http_response order by created desc limit 5;` Stop the job: `select cron.unschedule('daily-assistant-tick');`.

## Branding
Name "Daily Assistant" (trademark search clear 8 Nov 2026). Domain not bought; recommended dailyassistant.in (~937 INR, domain only, no add-ons). With a domain: Cloudflare Email Routing for hello@, Resend for login codes from no-reply@. Tagline idea: "medicine & routine reminders".

## Still open (Sakshi decides)
Skip-pattern insights, health readings log (BP, sugar, weight), doctor appointment and lab reminders, tapering doses, people without a phone, Sentry (optional).
