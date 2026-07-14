-- Relatos do projeto "What Is Your Love Project"
-- Seguro para executar mais de uma vez. Não apaga dados existentes.
create extension if not exists pgcrypto;

create table if not exists public.love_project_stories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null references public.projects(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  social_handle text not null default '',
  social_network text null,
  army_since text not null default '',
  city text not null default '',
  state text not null default '',
  story text not null check (char_length(story) between 20 and 5000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  source text not null default 'public' check (source in ('public','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null
);

create index if not exists love_project_stories_status_idx on public.love_project_stories(status, published_at desc);
create index if not exists love_project_stories_project_idx on public.love_project_stories(project_id);

alter table public.love_project_stories enable row level security;

drop policy if exists "Public can submit love stories" on public.love_project_stories;
create policy "Public can submit love stories" on public.love_project_stories
for insert to anon, authenticated
with check (status = 'pending' and source = 'public');

drop policy if exists "Public can read approved love stories" on public.love_project_stories;
create policy "Public can read approved love stories" on public.love_project_stories
for select to anon
using (status = 'approved');

drop policy if exists "Authenticated admins can read love stories" on public.love_project_stories;
create policy "Authenticated admins can read love stories" on public.love_project_stories
for select to authenticated using (true);

drop policy if exists "Authenticated admins can create love stories" on public.love_project_stories;
create policy "Authenticated admins can create love stories" on public.love_project_stories
for insert to authenticated with check (true);

drop policy if exists "Authenticated admins can update love stories" on public.love_project_stories;
create policy "Authenticated admins can update love stories" on public.love_project_stories
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated admins can delete love stories" on public.love_project_stories;
create policy "Authenticated admins can delete love stories" on public.love_project_stories
for delete to authenticated using (true);

grant select, insert on public.love_project_stories to anon;
grant select, insert, update, delete on public.love_project_stories to authenticated;
