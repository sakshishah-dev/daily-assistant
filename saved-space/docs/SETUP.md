# Saved Space: one-time setup

Do these in order. Each part has a "you are done when" line.

## Part 1: Create the tables (Supabase, about 5 minutes)

Why: Saved Space keeps folders, items and steps in the same Supabase project as Daily Assistant, so you use the same login.

1. Open Supabase and your Daily Assistant project.
2. Open **SQL Editor**, choose **New query**.
3. Copy everything from `saved-space/supabase/001_saved_space.sql` into it and press **Run**.
4. Done when: it says "Success. No rows returned", and **Table Editor** shows `ss_folders`, `ss_items`, `ss_subtasks`.

It is safe to run twice. Daily Assistant tables are not touched.

## Part 2: Find the two public values (Supabase)

1. **Project Settings > API Keys**: copy the **Publishable key** (starts with `sb_publishable_`). Never copy the Secret key anywhere.
2. **Project Settings > API**: note the **Project URL** (`https://xxxx.supabase.co`).

Both values are public and are meant to be inside the app. Row Level Security protects the data.

## Part 3: Make the hosting (Azure, about 15 minutes)

1. Create a free Azure account at azure.microsoft.com (a card is asked for identity; the Free plan is not charged).
2. In the Azure portal create a **Static Web App**: plan **Free**, region closest to India (Central India if offered, otherwise East Asia), deployment source **Other** (the GitHub workflow in this repo does the deploy).
3. Open the new Static Web App, **Overview > Manage deployment token**, copy it.
4. In GitHub, repo **Settings > Secrets and variables > Actions**:
   - Secret `AZURE_STATIC_WEB_APPS_API_TOKEN` = the deployment token.
   - Variable `SS_SUPABASE_URL` = the Project URL.
   - Variable `SS_SUPABASE_KEY` = the Publishable key.
5. In the Static Web App, **Settings > Environment variables**, add two (same values): `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The API reads these.
6. Merge the Saved Space pull request. Watch **Actions > Saved Space deploy** until it is green. The app address is on the Overview page.

## Part 4: Allow the login email (Supabase)

If you share Daily Assistant's project, your email is already on the invite list (`allowed_emails`) and nothing is needed. If Supabase says "signups not allowed", add it as in Daily Assistant's docs.

## Part 5: Test on your phone

See the list in the pull request. Install steps are also inside the app under **More**.
