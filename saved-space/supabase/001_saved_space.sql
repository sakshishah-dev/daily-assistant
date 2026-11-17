-- Saved Space, Phase 1 schema. Safe to run more than once.
-- All tables are prefixed ss_ so they sit next to Daily Assistant tables without clashing.
-- Every table has Row Level Security: a signed-in user can only see and change their own rows.

create table if not exists public.ss_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  icon       text not null default 'folder',
  color      text not null default 'green',
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.ss_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  folder_id    uuid not null,
  title        text not null check (char_length(title) between 1 and 500),
  url          text check (url is null or char_length(url) <= 2048),
  kind         text not null default 'web' check (kind in ('youtube', 'instagram', 'web', 'note')),
  thumb_url    text check (thumb_url is null or char_length(thumb_url) <= 2048),
  preview_json jsonb,
  note         text check (note is null or char_length(note) <= 10000),
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date     date,
  done_at      timestamptz,
  sort         int  not null default 0,
  created_at   timestamptz not null default now(),
  unique (id, user_id),
  -- The folder must belong to the same user, so one user can never attach an item to another user's folder.
  foreign key (folder_id, user_id) references public.ss_folders (id, user_id) on delete cascade
);

create table if not exists public.ss_subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id    uuid not null,
  text       text not null check (char_length(text) between 1 and 1000),
  done       boolean not null default false,
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  foreign key (item_id, user_id) references public.ss_items (id, user_id) on delete cascade
);

create index if not exists ss_folders_user_idx  on public.ss_folders  (user_id, sort);
create index if not exists ss_items_user_idx    on public.ss_items    (user_id, folder_id);
create index if not exists ss_items_due_idx     on public.ss_items    (user_id, due_date) where due_date is not null;
create index if not exists ss_subtasks_item_idx on public.ss_subtasks (item_id, sort);

alter table public.ss_folders  enable row level security;
alter table public.ss_items    enable row level security;
alter table public.ss_subtasks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ss_folders', 'ss_items', 'ss_subtasks'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Later phases (not built yet, nothing here blocks them):
--   ss_photos (item_id, storage_path), ss_goals, ss_members (shared folders).
