-- Ready Set Ink — account storage
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- Design note: one table, keyed by (user, storage key), holding the same JSON
-- blobs the browser already keeps in localStorage. The app has a single save()
-- and load() chokepoint, so syncing a key is a one-line change rather than a
-- new table and a new endpoint each time. Adding "collections" later means
-- adding one string to the allowlist below.

create table if not exists public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Only the keys the app actually syncs. Without this, anyone holding the
-- (public, by design) anon key could write arbitrary rows into your database
-- under their own user id and use it as free storage.
alter table public.user_state drop constraint if exists user_state_key_allowed;
alter table public.user_state add constraint user_state_key_allowed
  check (key in ('fs3_decks', 'fs3_dust', 'fs3_stars'));

-- A deck list is a few KB. A megabyte is already absurd, so anything above it
-- is either a bug or someone probing.
alter table public.user_state drop constraint if exists user_state_value_size;
alter table public.user_state add constraint user_state_value_size
  check (pg_column_size(value) < 1048576);

-- ---------------------------------------------------------------------------
-- Row Level Security. This is the whole reason for using Postgres rather than
-- rolling our own: the rule lives on the table, not in the app, so a bug in the
-- browser code cannot read someone else's decks. Nothing works until RLS is on
-- AND a policy allows the row, so the safe state is the default.
-- ---------------------------------------------------------------------------
alter table public.user_state enable row level security;

drop policy if exists "read own state"   on public.user_state;
drop policy if exists "insert own state" on public.user_state;
drop policy if exists "update own state" on public.user_state;
drop policy if exists "delete own state" on public.user_state;

create policy "read own state"   on public.user_state
  for select using (auth.uid() = user_id);

create policy "insert own state" on public.user_state
  for insert with check (auth.uid() = user_id);

create policy "update own state" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own state" on public.user_state
  for delete using (auth.uid() = user_id);

-- Keep updated_at honest — the client does not get to set it.
create or replace function public.touch_user_state()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch
  before insert or update on public.user_state
  for each row execute function public.touch_user_state();

-- ---------------------------------------------------------------------------
-- A note on dust, which is deliberate rather than an oversight.
--
-- fs3_dust is synced so a person's titles and prestige follow them between
-- devices. It is NOT an authoritative balance. Dust lives in localStorage and
-- anyone with developer tools can set it to any number they like before it ever
-- reaches this table, so what is stored here is "the number this person's
-- browser reported", not "the number they earned".
--
-- That is fine while dust gates jokes, cosmetic titles and mini-games. It stops
-- being fine the moment dust gates anything that costs money or that you would
-- be sorry to give away. At that point the earning has to move server-side and
-- this column stops being the source of truth. PATRON_ON is false in the app
-- for exactly this reason.
-- ---------------------------------------------------------------------------
