# Skill Proof: project notes

Portfolio project (Angular + .NET). Started 16 Nov 2026.
Status: research done, angle proposed, waiting for confirmation.

## 1. Idea in one line

A shareable page that shows **evidence of skill** from real activity (starting with GitHub), scored on repo quality, instead of a scoreboard of numbers.

## 2. How we got here

1. Brainstormed 14 app ideas, then API-based ideas. Most were clones of existing tools.
2. Chosen to explore: "Skill Proof Page generated from your real activity" (GitHub, Codeforces, Stack Overflow).
3. Concern: Codolio looks similar. Researched it (below).

## 3. Research findings

### Codolio (closest to the original idea)
- Aggregates LeetCode, GeeksforGeeks, InterviewBit, CodeChef, Codeforces, AtCoder, HackerRank and GitHub on one profile.
- Shows problem counts, contest history, heatmaps, GitHub repos and contributions, contest calendar, shareable card.
- GitHub is connected by OAuth with public read access. Coding platforms only need a public username.
- Updates on demand (visiting the profile triggers a refresh).
- It tracks activity totals. It does not execute code or judge code quality.
- Its GitHub stats come from an undocumented internal endpoint, so do not depend on it.

Conclusion: a plain "aggregate GitHub + Codeforces + Stack Overflow stats" app is a **clone of Codolio**. Do not build that.

### Other tools found
- **CodersRank**: aggregates GitHub, GitLab, Stack Overflow, LinkedIn into a developer profile and ranking. Closest established competitor.
- **Peerlist**: professional network and work profiles (more networking and hiring than analysis).
- **GitRoll**: "developer passport" with verifiable portfolios; paid plans reported (check pricing on its own site).
- **GitRanks, GitHub Report Card**: narrower GitHub analytics.

### GitHub repo-quality analysers (the angle we considered)
Many exist, mostly hobby or student projects:
- GitSignal AI (portfolio score 0 to 100: docs, consistency, depth, completion, collaboration, hygiene)
- repo-analyzer on PyPI (CLI, recruiter mode, maintenance/quality/docs scores, JSON/PDF export)
- DevFolio Analyzer, Dev-Score, GitSight, gitboard.app (weighted score), a Next.js + Gemini analyzer

Conclusion: "GitHub profile score" alone is **also crowded**. Scoring weights differ widely and none is a standard.

## 4. Honest verdict

The idea is not unique as a category. It can still be a strong portfolio piece if it has a sharp, defensible angle and is built well. Originality here comes from the angle and execution quality, not from the category being empty.

## 5. Proposed angle (to confirm)

**Evidence-backed, role-based proof for freshers in India, with an improvement coach.**

What the existing tools mostly do not do (based on the search, not a guarantee):
1. **Role-based view**: the same profile shows backend evidence first for a backend recruiter, frontend first for a frontend one.
2. **Claim to proof mapping**: "Angular: 3 repos, 2 with tests, 1 deployed demo, active in the last 30 days" rather than a number out of 100.
3. **Explainable score**: every point links to the repo and the reason (README present, tests found, CI config, live link). No black-box AI score.
4. **Improvement coach**: concrete next steps ("add tests to repo X", "pin a project with a demo link").
5. **Fresher focus**: judged on small projects done well, not on stars or followers.

Open decision: keep the name and pitch around "proof for freshers", or aim wider.

## 6. MVP scope (finishable)

- Sign in with GitHub (OAuth), public data only.
- Analyse public repos via GitHub REST/GraphQL.
- Per-repo checks: README quality, tests present, CI config, license, live demo link, commit spread over time, fork vs original, languages.
- Skill cards by technology with evidence links.
- Public shareable profile URL (read only, user can hide repos).
- Improvement tips list.
- Later: Codeforces and Stack Overflow evidence, PDF export, recruiter role views.

Out of scope for now: AI scoring, paid features, private repo access, social features.

## 7. Technical plan (draft)

- Frontend: Angular, standalone components, signals, Angular Material or Tailwind, charts via ngx-charts or Chart.js.
- Backend: ASP.NET Core Web API, clean/layered architecture, EF Core with PostgreSQL (or SQL Server).
- Auth: GitHub OAuth, then JWT with refresh tokens for the app.
- Background work: Hangfire for scheduled profile refresh, with ETag caching and rate-limit handling for the GitHub API.
- Resilience: Polly retries and timeouts.
- Tests: xUnit for scoring rules (the core logic), Angular component tests, a few integration tests.
- CI/CD: GitHub Actions, deploy on free tiers.
- Security: tokens stored server side only, public data only, rate limit the public profile endpoint.

## 8. Build order (draft)

1. Repo setup, CI, solution structure, README.
2. GitHub OAuth login and user model.
3. Fetch repos and store a snapshot.
4. Scoring engine: one rule at a time, each with unit tests.
5. Profile page in Angular with evidence links.
6. Public share URL and privacy controls.
7. Scheduled refresh and caching.
8. Improvement tips.
9. Polish, demo data, deploy, write the case study.

## 9. How to stay original

- Check competitors again before building (20 minutes: search, store listings, Reddit).
- Keep one sharp angle. Do not try to cover every platform.
- Write the README as a case study: the problem, what exists, what is different, design choices.

## 10. Open questions

- Final angle: role-based proof for freshers (proposed) or something else?
- Database: PostgreSQL or SQL Server?
- UI library: Angular Material or Tailwind?
- Name for the project.

## Sources

- https://codolio.com/help-center/article/key-features-overview
- https://codolio.com/help-center/article/profile-tracker
- https://codolio.com/help-center/article/how-to-connect-verify-your-coding-platforms
- https://dev.to/naman_2004/extracting-dsa-question-statistics-from-codolio-and-takeuforward-tuf-5g7o
- https://codersrank.io/
- https://github.com/nirvik34/github_analyzer
- https://pypi.org/project/repo-analyzer/
- https://devfoliodocs.vercel.app
