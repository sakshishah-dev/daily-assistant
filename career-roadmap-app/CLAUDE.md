# Career Roadmap App (IT) — Project Brief for Claude

Written 14 Nov 2026. This folder is a NEW project (separate from Daily Assistant). It holds only this brief so far.
When the user opens this folder, read this file fully, then continue from section 12 (Next steps).
Ask before big decisions. No app code exists yet; do not assume any.

---

## 0. Instructions for the next Claude (read first)

- The user is a software developer with about 2 years of experience, currently at about 6 LPA, in Ahmedabad, India. They plan to switch jobs in **March-April 2027** and are counted as 2 years experienced.
- They already built and run a personal PWA called **Daily Assistant** (React 18 + TypeScript + Vite + Tailwind, Vercel serverless API in Node, Supabase with RLS, web-push). It is a medicine reminder, habit tracker and routine monitor. Do not rebuild it.
- Explain things in **simple words**, define unfamiliar terms briefly. The user is fairly new to some of this.
- If a task needs actions from the user (dashboards, accounts, settings): first give a short overview of why and the list of steps (one line each), then give only Step 1 in detail, and wait for their result before the next step.
- Never ask them to paste secrets (passwords, API keys, service keys) into chat.
- Be honest: separate **sourced facts**, **my general knowledge**, and **unverified guesses**. Never promise a job or a salary. Do not fabricate sources.
- Web search in the previous session could not open Reddit (blocked). Reddit, Glassdoor and AmbitionBox pages were not read directly; only search-result summaries were available.

---

## 1. The user's goals

1. Switch jobs in Mar-Apr 2027 to a **full stack role (.NET + Angular)** in **Ahmedabad / Gandhinagar**, target **10-15 LPA** (current about 6 LPA).
2. Learn **AWS** and **CI/CD** by moving their projects to AWS. Possibly also learn React.
3. Build a **proper, real website/app** (not a throwaway project) in **Angular + .NET**, as a portfolio piece that is also genuinely useful to people.
4. They want to work on the app with another Claude account, continuing from this file.

---

## 2. Market picture 2025-2027 (what was found)

Sourced (from search results, not all pages fully opened):
- India IT hiring is forecast to grow only about **7% in FY27** (CII-Taggd study); other forecasts say hiring stays subdued through 2027 (HAN Digital). Xpheno: active tech demand fell 8% month-on-month in April 2026.
- **Entry-level roles are hit hardest** (about 20-25% contraction attributed to AI); **mid-level share of hiring rose** (50% to 65% in one report). Companies are moving from a "pyramid" to a "diamond" shape.
- Employers increasingly expect candidates to use AI coding tools and still understand the code.
- Glassdoor snapshots in 2026 showed roughly 159 .NET developer listings and 77 ".NET Angular" listings in Ahmedabad, and 13 in Gandhinagar (counts change often).

Sources:
- https://www.dqindia.com/news/hiring-in-tech-sector-to-grow-7-in-fy-27-cii-taggd-study-10758287
- https://analyticsindiamag.com/gcc/indias-tech-hiring-momentum-hits-a-road-bumpbut-dont-blame-ai-just-yet
- https://www.businesstoday.in/amp/technology/news/story/indian-its-hiring-model-is-changingand-ai-is-the-reason-512582-2026-01-23
- https://www.handigital.com/?p=11503
- https://www.glassdoor.co.in/Job/ahmedabad-net-angular-developer-jobs-SRCH_IL.0,9_IC2935226_KO10,31.htm
- https://www.glassdoor.co.in/Job/ahmedabad-angular-developer-jobs-SRCH_IL.0,9_IC2935226_KO10,27.htm
- https://cutshort.io/jobs/angular-jobs-in-ahmedabad
- https://internshala.com/jobs/angular-and-net-core-full-stack-developer-jobs-in-ahmedabad/

---

## 3. Salary reality (6 LPA to 10-15 LPA)

Conclusion: **10-12 LPA is realistic with good preparation; 15 LPA is possible only with a product company or a strong offer. Do not count on it.** Online salary data is messy; use it as a rough range.

| Company type | Likely offer at 2 yrs (LPA, approximate) | Basis |
| --- | --- | --- |
| Small service / outsourcing firms | 4-8 | Postings: Prompt Equipment 6-11 (employer-stated), AgileCube 3-8, Space Stem 6-8 (Glassdoor estimates) |
| Mid-size service companies | 7-11 | General pattern |
| Product / well-known Ahmedabad firms, GCCs | 10-16 | General pattern; aggregator pages show 12-18 for Angular in Ahmedabad but are unreliable |
| Big MNC services (TCS, Infosys, Wipro) | 4-9 | AmbitionBox estimate for Infosys .NET 2-6 yrs: 3-8.5 |

- AmbitionBox estimate for a 3-year .NET developer in Ahmedabad: about 4.3-5.5 LPA (page from 2024, few reports).
- One 2026 resume-site guide says 3-6 yrs .NET in Ahmedabad is 8-18 LPA (single site, weak evidence).
- Most postings for exactly "2+ years .NET + Angular" show **up to 6-8 LPA**. 10 LPA+ offers go to people who pass harder interviews and negotiate.
- Tips: do not state expected salary first; ask for the range. Current salary is not a ceiling. A competing offer helps most.

---

## 4. What job descriptions ask for (.NET + Angular, 2-4 years)

**Almost always required:** C#, .NET Core / .NET 8, ASP.NET Core Web API, MVC, Entity Framework Core, LINQ, SQL Server (joins, stored procedures, indexes), Angular (components, services, routing, forms, RxJS, HttpClient), TypeScript, HTML/CSS, REST APIs, JWT auth, Git.

**Often listed (general pattern; separates 6 LPA from 10+ LPA):** clean architecture, SOLID, design patterns, DI, unit testing (xUnit/NUnit, Moq), Docker, CI/CD, basic cloud (Azure or AWS), Agile/JIRA, code reviews. For 2-3 years, **system design basics** are also commonly asked in interviews even when not written in the posting (this is general knowledge, not from job postings).

**Nice to have:** microservices, RabbitMQ/Kafka, Redis, Dapper, SignalR, React ("Angular or React"), cloud certification.

Note on AWS: the search did not confirm how often postings ask for AWS. From general experience Azure is more common with .NET. Verify on the job boards.

---

## 5. Interview rounds and questions

Only one sourced round-by-round account was found (a 2023 .NET/Angular case: basic .NET and C# questions, then an online coding interview). The structure below is a **general pattern**; verify per company on Glassdoor / AmbitionBox / Naukri Code360.

1. HR / phone screen (salary, notice period, why switching)
2. Written or machine test (C#, SQL, small coding task) - common in service companies
3. Technical round 1 (C#, .NET Core, SQL, Angular basics, your project)
4. Technical round 2 for stronger companies (system/API design, performance, live coding or take-home)
5. Manager / HR round (salary, team fit)

Topics that repeat (Hirist, InterviewBit, Indeed lists):
- .NET Core: DI and lifetimes (Singleton/Scoped/Transient), middleware order, Configuration API, JWT, async/await, EF Core (tracking, lazy loading, N+1)
- Angular: components, lifecycle hooks, services/DI, routing, guards, interceptors, RxJS (switchMap, async pipe), reactive forms
- SQL: joins, indexes, stored procedures, "second highest salary"
- At 2-3 years they ask about **your own work**: hardest problem, deadlines, migrating .NET Framework to .NET Core. "Tell me about your project" decides most interviews.

Sources:
- https://www.hirist.tech/blog/top-30-net-core-interview-questions-and-answers/
- https://www.interviewbit.com/dot-net-interview-questions/
- https://in.indeed.com/career-advice/interviewing/net-core-interview-questions

---

## 6. Companies to target (Ahmedabad / Gandhinagar)

- **Postings seen for .NET + Angular (2026):** Prompt Equipment, Space Stem, AgileCube Technologies, Facile Technolab, Simform.
- **Gandhinagar postings:** Silver Touch Technologies, VedikIn Solutions.
- **From memory, unverified (check each):** Radixweb, Crest Data Systems, BrainerHub, Intelligent Bytes, Openxcell, Moon Technolabs, Cygnet Infotech, eInfochips, Tatvasoft.
- **Big MNC offices:** TCS, Infosys, Wipro, Capgemini-type firms (lower pay at 2 yrs, strong CV name).
- **GIFT City (Gandhinagar):** finance/fintech and global in-house centres (from memory, unverified).
- Find roles on LinkedIn alerts, Naukri, Cutshort, Indeed, Instahyre, company career pages. **Employee referrals** are the easiest way past first screening for 10+ LPA roles.

---

## 7. What to learn (priorities)

| Priority | Topic |
| --- | --- |
| Must | C# (async/await, LINQ, OOP, SOLID), .NET 8 Web API, middleware, DI |
| Must | EF Core + SQL Server (joins, indexes, stored procedures, query tuning) |
| Must | Angular + TypeScript + RxJS, reactive forms, guards, interceptors |
| Must | JWT auth, REST design, error handling, logging |
| Must | Explain 1-2 projects end to end |
| Good | Unit tests (xUnit, Moq), clean architecture, design patterns, **system design basics** |
| Good | Docker, Git workflow, CI/CD, basic AWS |
| Good | DSA basics (arrays, strings, hash map, two pointers, recursion) |
| Later | React (Daily Assistant already uses React + TypeScript, so one React project exists) |
| Later | Microservices, Redis, queues |
| Skip for now | Kubernetes, many AWS services, new frameworks |

AWS certification (Cloud Practitioner or Developer Associate) is optional; a deployed app with a pipeline is stronger proof.

---

## 8. AWS + CI/CD plan

- **Project A - Daily Assistant (learn AWS + pipelines):** frontend on S3 + CloudFront; move `frontend/api/*` functions to Lambda + API Gateway; the pg_cron job calls `/api/cron/tick` every minute, so its URL must change at cutover; secrets in Secrets Manager or SSM Parameter Store (never in code); GitHub Actions pipeline (tests, build, deploy) using **OIDC role login** instead of stored AWS keys; staging branch + manual approval.
- **Project B - a .NET 8 + Angular app (learn the job stack):** clean architecture API, EF Core, JWT, xUnit tests; Docker; deploy to App Runner or ECS Fargate with RDS (or Elastic Beanstalk to start); Angular on S3 + CloudFront; CloudWatch logs.
- **Cost warning:** AWS free-tier rules for new accounts changed recently; read the current free-tier page, set a **billing budget alert on day one**, and shut down RDS, NAT gateways and load balancers when not practising.
- **Safe order:** keep Daily Assistant live on Vercel while building the AWS copy; switch the cron URL only after the AWS version passes the same checks. Do not touch the live app during Mar-Apr 2027 job-hunt weeks.
- Project B is now proposed to be the **Career Roadmap App** below.

---

## 9. 4-month study plan (mid-Nov 2026 to mid-Mar 2027)

About 1.5-2 h on weekdays, 4 h on weekends.
1. Weeks 1-4: C#/.NET 8 deep review, SQL daily, EF Core; start Project B skeleton (JWT, tests).
2. Weeks 5-8: Angular + RxJS, connect to API, Docker; 2 easy DSA problems a week.
3. Weeks 9-12: AWS + GitHub Actions for Project B, then Daily Assistant copy; CloudWatch; budget alert; optional small React task.
4. Weeks 13-16: interview mode: 2-minute project story, mock interviews weekly, CV/LinkedIn/GitHub README with diagrams, ask 10 people for referrals.
5. Mar-Apr 2027: apply to 5-8 companies a week, aim for 2-3 interviews a week, easy companies first, negotiate with offers in hand.
Daily habit: 1 SQL query, 1 interview question answered aloud, 30 min building. Month-end check: can you explain that month's topic simply?

---

## 10. Project idea discussion (how we got to the current idea)

The user wants a project that is **a real problem, not a clone, and useful**. Ideas discussed and rejected/kept:
- Father's curtain/sofa shop as an internal back-office tool (measurements, quotes, order status): good idea but the user wants problems from people **across the world / India / Gujarat**, not people around them.
- Public unmet-need leads (from listicle sources, not verified Reddit threads): freelancer money app (tax set-aside, invoice chasing, income forecast), Gujarat cooperative/FPO tool in Gujarati and offline, shift-worker routine planner, co-parent expense splitting, caregiver coordination. User did not like these.
- Daily-life ideas like Daily Assistant: Ghar Hisab (milk/maid/tiffin attendance + monthly bill), life-admin vault (vehicle/insurance/warranty expiry), vyavahar tracker (gift giving records), **interview prep tracker**. **User chose the interview prep tracker.**
- **Refined concept (current):** not a reminder app. A **career roadmap website for students and working professionals in IT**. Users enter their experience, current skills, target role/technology, months available and hours per week. The site shows a **skill gap**, a **feasibility estimate** ("Likely / Stretch / Unlikely" with reasons), a **roadmap with resources and a plan**, and a **weekly-refreshed "what's new in the market"** view from a database. **Scope: IT roles only.** Must be a proper website, can take long to build. They also want data like **system design expectations for 2-3 years experience**.
- Decision rule from the user: start only if the vision is feasible with low-noise data; otherwise switch ideas.

---

## 11. Feasibility analysis (findings so far)

**Verdict: feasible as a hybrid of curated knowledge + live market data. "Fully automatic, zero noise, every type of data" is not achievable.** Test first.

| Part | Verdict |
| --- | --- |
| Profile + skill-gap analysis | Yes, easy (database logic) |
| Feasibility estimate | Yes, as an estimate: hours needed per missing skill vs hours available. Never promise outcomes |
| Roadmap + resources | Yes, but this is the main work: it needs well-written curated content |
| Weekly market refresh | Partly: depends on a legal data source and enough India volume |
| System design and non-posting knowledge | Yes, but from **curated content**, because job ads rarely state it |
| Zero noise | No. Skill extraction research says ads use varied wording, often only imply skills and need normalising. Low noise is achievable |

**Data sources:**
- Do **not** scrape LinkedIn, Naukri or Indeed. Indeed's terms reportedly forbid crawling; US court rulings (hiQ v. LinkedIn) did not settle contract/terms-of-service claims; nothing was found on Indian law or Naukri terms. Not legal advice.
- Use a licensed **job-search API** such as **Adzuna** (sources say India is covered; they **conflict on free limits** - about 1,000 calls a month in some, tighter per-minute/day caps in others - and say commercial use may need a "Jobs by Adzuna" logo and a licence). **None of this was confirmed from an official page. Check developer.adzuna.com first.**
- Add curated weekly notes by hand (new .NET/Angular releases, trends) via an admin screen. Optional: Hacker News "Who is hiring" API, Remotive/Arbeitnow feeds, Stack Overflow survey, GitHub trending (global signals; India coverage unverified).
- **Risk:** India volume on a free API may be small; city-level (Ahmedabad + .NET) trends may need monthly instead of weekly numbers.

**Noise control plan:**
1. Fixed skills list (~300 IT skills) with aliases (e.g. "EF Core" = "Entity Framework Core"), not free-form AI guessing.
2. De-duplicate postings (company + title + description similarity).
3. Show a trend only with enough postings (e.g. 30+ per role/city), else say "not enough data".
4. Always show sample size and date ("Docker: 41% of 212 postings, week of 8 Mar").
5. Hand-label 100 postings and measure extractor accuracy; aim for 90%+ before launch.
6. "Report wrong data" button.

**Usefulness / competition:**
- Search found mostly enterprise HR skill-gap tools (Workday, Fuel50, Eightfold, etc.). One guide says most tools name the gap once but rarely connect it to learning and re-measure. Individual-focused: Bridged (career path quiz). Free role roadmaps like roadmap.sh exist (from memory, not checked this session).
- A possible gap: a free personalised plan using the user's experience, time available and current Indian market data. **Not proven.** What will decide usefulness is **roadmap quality**: fewer roles written very well beat many thin ones.

Sources:
- https://oulurepo.oulu.fi/bitstream/handle/10024/51701/nbnfioulu-202409035692.pdf?sequence=1&isAllowed=y
- https://www.nesta.org.uk/project-updates/skills-extraction-ojo/
- https://developer.adzuna.com/overview
- https://jobspipe.dev/blog/is-web-scraping-legal (vendor blog)
- https://superdots.sh/blog/ai-skills-gap-analysis/
- https://interexy.com/app-ideas-2026-real-problems and https://www.nichemetric.com/blog/underserved-app-markets-2026 (idea listicles)

---

## 12. Next steps (continue from here)

### 12a. Two-week feasibility test (do this BEFORE building the website)
1. **Data test:** register for the job API (check official limits/licence first), pull postings for 3 IT roles in India (.NET full stack, Angular/React front end, Java backend), count postings per week, per city.
2. **Accuracy test:** hand-label 100 postings, run a keyword/alias skill extractor, measure precision/recall. Pass = about 90%+ on target skills.
3. **Content test:** write ONE complete roadmap for ".NET + Angular, 2-3 years, target 10-15 LPA", including system design basics, resources and weekly hours. Show it to 5 people at similar levels; ask if they would follow it.
4. **Go / no-go:**
   - Go: enough postings, accuracy 90%+, at least 3 of 5 testers would follow the plan.
   - Pause: data too thin -> launch with curated content and national-level trends only.
   - Switch idea: content test fails (people do not find the plan useful).

### 12b. If it passes, build order
1. Skills list, roles and hand-written roadmaps for 3 IT roles.
2. Profile, gap analysis, feasibility estimate.
3. Weekly data job, trend charts, "what changed this week", admin screen for curated notes.
4. Polish: login, saved plans, Gujarati/Hindi, privacy page, clear "estimates, not guarantees" notice.

### 12c. Proposed tech
| Part | Choice |
| --- | --- |
| Frontend | Angular (standalone components, RxJS, chart library) |
| API | .NET 8 Web API, JWT, EF Core |
| Database | SQL Server or PostgreSQL: users, skills, skill aliases, roles, postings, weekly skill counts, resources, roadmaps, user plans |
| Weekly job | Hangfire or hosted background service, plus admin trigger (EventBridge optional on AWS) |
| Optional | LLM-written plan text on top of the rules output (rules stay source of truth) |
| Deploy | AWS with GitHub Actions pipeline (as in section 8) |

### 12d. Open questions to ask the user
- Is the first role the user's own (.NET + Angular full stack)? (Recommended: yes, test the roadmap on themselves.)
- Which database do they prefer (SQL Server vs PostgreSQL) and what AWS budget is acceptable (they like Rs 0 where possible)?
- Do they want the test plan (12a) written step by step with scripts first? (Suggested first action.)

### 12e. Suggested first action for the next Claude
Start 12a step 1: help the user check the Adzuna developer page for current limits, India coverage and licence terms, then write a small .NET console or script to pull postings and count them per week for the 3 roles. Use the "one step at a time" format from section 0.
