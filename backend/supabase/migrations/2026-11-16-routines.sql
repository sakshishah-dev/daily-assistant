-- Routines: a named group of reminders with its own time and ONE notification.
-- A routine is a set of normal exact-time reminders that share routine_id + routine_name
-- (routine_order = position in the list). Dose logs, stock, reports and family sharing are unchanged.
-- Safe to run more than once.

alter table public.reminders add column if not exists routine_id    text;
alter table public.reminders add column if not exists routine_name  text;
alter table public.reminders add column if not exists routine_order int;

alter table public.reminders drop constraint if exists reminders_routine_check;
alter table public.reminders add constraint reminders_routine_check check (
  (routine_id is null and routine_name is null)
  or (routine_id ~ '^[A-Za-z0-9_-]{1,60}$' and char_length(routine_name) between 1 and 80)
);

create index if not exists reminders_routine_idx on public.reminders (user_id, routine_id) where routine_id is not null;

-- No new grants or policies are needed: reminders has row-level policies only (own_all, family_read/insert/update/delete),
-- and they cover every column. Followers still see ONLY medicines, including medicines that sit inside a routine.

-- Snooze keys: allow 'routine-<routineId>' next to the slot names and 'custom-<reminderId>'.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.snoozes'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%custom-%'
  loop
    execute format('alter table public.snoozes drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.snoozes add constraint snoozes_key_check check (
  key ~ '^(morning|afternoon|after_dinner|overall|custom-[A-Za-z0-9_-]{1,80}|routine-[A-Za-z0-9_-]{1,60})$'
);
