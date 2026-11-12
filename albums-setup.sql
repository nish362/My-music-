-- Anna's Song: Albums support
-- Run this SQL ONCE in Supabase SQL Editor.
-- Songs can be included in more than one album.

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.album_songs (
  album_id uuid not null references public.albums(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (album_id, song_id)
);

alter table public.albums enable row level security;
alter table public.album_songs enable row level security;

drop policy if exists "Anyone can view albums" on public.albums;
create policy "Anyone can view albums" on public.albums
for select to anon, authenticated using (true);

drop policy if exists "Owner can add albums" on public.albums;
create policy "Owner can add albums" on public.albums
for insert to authenticated
with check (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

drop policy if exists "Owner can update albums" on public.albums;
create policy "Owner can update albums" on public.albums
for update to authenticated
using (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid)
with check (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

drop policy if exists "Owner can delete albums" on public.albums;
create policy "Owner can delete albums" on public.albums
for delete to authenticated
using (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

drop policy if exists "Anyone can view album songs" on public.album_songs;
create policy "Anyone can view album songs" on public.album_songs
for select to anon, authenticated using (true);

drop policy if exists "Owner can add album songs" on public.album_songs;
create policy "Owner can add album songs" on public.album_songs
for insert to authenticated
with check (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

drop policy if exists "Owner can update album songs" on public.album_songs;
create policy "Owner can update album songs" on public.album_songs
for update to authenticated
using (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid)
with check (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

drop policy if exists "Owner can delete album songs" on public.album_songs;
create policy "Owner can delete album songs" on public.album_songs
for delete to authenticated
using (auth.uid() = 'f7cc8308-6647-4c54-82ce-4e69e78a4f63'::uuid);

grant select on public.albums, public.album_songs to anon, authenticated;
grant insert, update, delete on public.albums, public.album_songs to authenticated;
