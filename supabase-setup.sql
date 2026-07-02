-- ============================================================
-- Nume Brand — Supabase setup
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- ============================================================

-- 1) Site content (a single editable JSON document, id = 1)
create table if not exists public.site_content (
  id          int primary key default 1,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.site_content (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 2) Contact-form submissions
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  company       text,
  contact_name  text,
  phone         text,
  email         text,
  city_project  text,
  apartments    text,
  message       text
);

-- 3) Row Level Security
alter table public.site_content enable row level security;
alter table public.leads        enable row level security;

-- Everyone (anonymous visitors) can READ the site content
drop policy if exists "content public read" on public.site_content;
create policy "content public read"
  on public.site_content for select
  to anon, authenticated using (true);

-- Only a logged-in admin can CREATE/UPDATE the content
drop policy if exists "content admin write" on public.site_content;
create policy "content admin write"
  on public.site_content for insert
  to authenticated with check (true);

drop policy if exists "content admin update" on public.site_content;
create policy "content admin update"
  on public.site_content for update
  to authenticated using (true) with check (true);

-- Anyone can SUBMIT a contact form (insert only)
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert"
  on public.leads for insert
  to anon, authenticated with check (true);

-- Only a logged-in admin can READ submissions
drop policy if exists "leads admin read" on public.leads;
create policy "leads admin read"
  on public.leads for select
  to authenticated using (true);
