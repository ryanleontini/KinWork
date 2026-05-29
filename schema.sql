-- KinOS — Database schema, RLS policies, and storage setup
-- Run this in the Supabase SQL editor on a fresh project.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  photo_url text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('kinkeeper', 'member')),
  display_name text not null,
  avatar_url text,
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text,
  type text not null default 'post' check (type in ('post', 'photo', 'story', 'recipe')),
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'document')),
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  media_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  title text,
  description text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'document')),
  folder text,
  tags text[],
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_by uuid not null references auth.users (id) on delete cascade,
  email text,
  invite_code text not null unique,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_family_members_family on public.family_members (family_id);
create index if not exists idx_family_members_user on public.family_members (user_id);
create index if not exists idx_posts_family on public.posts (family_id, created_at desc);
create index if not exists idx_post_media_post on public.post_media (post_id);
create index if not exists idx_reactions_post on public.reactions (post_id);
create index if not exists idx_comments_post on public.comments (post_id);
create index if not exists idx_messages_family on public.messages (family_id, created_at);
create index if not exists idx_garden_family on public.garden_items (family_id, created_at desc);
create index if not exists idx_invites_code on public.invites (invite_code);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on family_members)
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create or replace function public.is_kinkeeper(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role = 'kinkeeper'
  );
$$;

create or replace function public.owns_family(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.families
    where id = fid and created_by = auth.uid()
  );
$$;

create or replace function public.has_open_invite(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.invites
    where family_id = fid and accepted = false
  );
$$;

create or replace function public.can_access_post(pid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.posts p
    join public.family_members fm on fm.family_id = p.family_id
    where p.id = pid and fm.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;
alter table public.garden_items enable row level security;
alter table public.invites enable row level security;

-- families
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select using (public.is_family_member(id));

drop policy if exists families_insert on public.families;
create policy families_insert on public.families
  for insert with check (created_by = auth.uid());

drop policy if exists families_update on public.families;
create policy families_update on public.families
  for update using (public.is_kinkeeper(id)) with check (public.is_kinkeeper(id));

drop policy if exists families_delete on public.families;
create policy families_delete on public.families
  for delete using (public.is_kinkeeper(id));

-- family_members
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
  for select using (public.is_family_member(family_id));

drop policy if exists family_members_insert on public.family_members;
-- Direct inserts are restricted to creating one's own founding kinkeeper
-- membership (when starting a family) or to existing kinkeepers adding
-- members on behalf. The invite-code join path goes through the
-- accept_invite() SECURITY DEFINER function defined below, which is the
-- only way a non-member can be added to a family they don't own.
create policy family_members_insert on public.family_members
  for insert with check (
    user_id = auth.uid()
    and (
      public.owns_family(family_id)
      or public.is_kinkeeper(family_id)
    )
  );

drop policy if exists family_members_update on public.family_members;
create policy family_members_update on public.family_members
  for update using (
    user_id = auth.uid() or public.is_kinkeeper(family_id)
  );

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members
  for delete using (
    user_id = auth.uid() or public.is_kinkeeper(family_id)
  );

-- posts
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select using (public.is_family_member(family_id));

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert with check (
    author_id = auth.uid() and public.is_family_member(family_id)
  );

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts
  for update using (author_id = auth.uid() or public.is_kinkeeper(family_id));

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts
  for delete using (author_id = auth.uid() or public.is_kinkeeper(family_id));

-- post_media
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
  for select using (public.can_access_post(post_id));

drop policy if exists post_media_insert on public.post_media;
create policy post_media_insert on public.post_media
  for insert with check (public.can_access_post(post_id));

drop policy if exists post_media_delete on public.post_media;
create policy post_media_delete on public.post_media
  for delete using (public.can_access_post(post_id));

-- reactions
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select using (public.can_access_post(post_id));

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert with check (user_id = auth.uid() and public.can_access_post(post_id));

drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete using (user_id = auth.uid());

-- comments
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (public.can_access_post(post_id));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (author_id = auth.uid() and public.can_access_post(post_id));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete using (author_id = auth.uid());

-- messages
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_family_member(family_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (sender_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete using (sender_id = auth.uid() or public.is_kinkeeper(family_id));

-- garden_items
drop policy if exists garden_select on public.garden_items;
create policy garden_select on public.garden_items
  for select using (public.is_family_member(family_id));

drop policy if exists garden_insert on public.garden_items;
create policy garden_insert on public.garden_items
  for insert with check (uploaded_by = auth.uid() and public.is_family_member(family_id));

drop policy if exists garden_update on public.garden_items;
create policy garden_update on public.garden_items
  for update using (uploaded_by = auth.uid() or public.is_kinkeeper(family_id));

drop policy if exists garden_delete on public.garden_items;
create policy garden_delete on public.garden_items
  for delete using (uploaded_by = auth.uid() or public.is_kinkeeper(family_id));

-- invites
-- Any authenticated user can read invites so they can validate a code to join.
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select using (auth.uid() is not null);

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert with check (invited_by = auth.uid() and public.is_family_member(family_id));

-- Any authenticated user can flip an invite to accepted while joining.
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update using (auth.uid() is not null);

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete using (public.is_kinkeeper(family_id));

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists media_auth_upload on storage.objects;
create policy media_auth_upload on storage.objects
  for insert with check (bucket_id = 'media' and auth.uid() is not null);

drop policy if exists media_owner_update on storage.objects;
create policy media_owner_update on storage.objects
  for update using (bucket_id = 'media' and auth.uid() = owner);

drop policy if exists media_owner_delete on storage.objects;
create policy media_owner_delete on storage.objects
  for delete using (bucket_id = 'media' and auth.uid() = owner);

-- ---------------------------------------------------------------------------
-- accept_invite() — the only path for a non-member to join a family
-- ---------------------------------------------------------------------------
-- Runs as the function owner (SECURITY DEFINER) and atomically:
--   1. validates the code against an unaccepted invite,
--   2. confirms the caller isn't already a member,
--   3. inserts the family_members row with the given display name,
--   4. marks the invite accepted (so the code is single-use).
-- The family_members RLS policy no longer permits "insert because there's an
-- open invite somewhere" — joining only happens through here.

create or replace function public.accept_invite(
  p_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.invites%rowtype;
begin
  if v_user is null then
    raise exception 'You must be signed in to accept an invite.'
      using errcode = 'P0001';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'Please share a name the family can call you.'
      using errcode = 'P0001';
  end if;

  select * into v_invite
  from public.invites
  where invite_code = upper(p_code) and accepted = false
  limit 1;

  if not found then
    raise exception 'That invite code doesn''t match an open invite.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.family_members
    where family_id = v_invite.family_id and user_id = v_user
  ) then
    raise exception 'You''re already part of this family!'
      using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_invite.family_id, v_user, 'member', trim(p_display_name));

  update public.invites set accepted = true where id = v_invite.id;

  return v_invite.family_id;
end;
$$;

revoke all on function public.accept_invite(text, text) from public;
grant execute on function public.accept_invite(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (for the chat page)
-- ---------------------------------------------------------------------------
-- Adds public.messages to the supabase_realtime publication so the chat's
-- postgres_changes subscription receives INSERT events.
--
-- Failure-tolerant: if the ALTER PUBLICATION can't run (already a member,
-- ownership edge case, etc.) we RAISE NOTICE instead of aborting the whole
-- script — so the rest of schema.sql still applies cleanly. If you see a
-- notice below saying it couldn't be added, run this line in the SQL editor
-- yourself:
--   alter publication supabase_realtime add table public.messages;

do $$
begin
  alter publication supabase_realtime add table public.messages;
  raise notice 'Added public.messages to supabase_realtime publication.';
exception
  when duplicate_object then
    raise notice 'public.messages is already in supabase_realtime publication.';
  when others then
    raise notice 'Could not add public.messages to supabase_realtime: % (%)',
      sqlerrm, sqlstate;
end $$;
