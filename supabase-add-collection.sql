-- Ready Set Ink — allow the collection to sync
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run twice.
--
-- The original schema deliberately allowlists which keys may be written, so
-- nobody can use the database as free storage. Syncing two new things means
-- widening that list by exactly two entries.
--
--   fs3_coll      — which printings you own, normal and foil
--   fs3_borrowdef — your saved borrow-message template
--
-- Until this runs, the app still works: the collection saves in your browser as
-- it always did, and the sync for it is simply refused by the database.

alter table public.user_state drop constraint if exists user_state_key_allowed;
alter table public.user_state add constraint user_state_key_allowed
  check (key in ('fs3_decks', 'fs3_dust', 'fs3_stars', 'fs3_coll', 'fs3_borrowdef'));
