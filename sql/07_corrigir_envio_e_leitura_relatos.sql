-- CORREÇÃO DEFINITIVA DOS RELATOS DO LOVE PROJECT
-- Seguro para executar mais de uma vez.
-- Não apaga nem modifica relatos já salvos.

create extension if not exists pgcrypto;

create table if not exists public.love_project_stories (
  id uuid primary key default gen_random_uuid()
);

alter table public.love_project_stories add column if not exists project_id uuid null;
alter table public.love_project_stories add column if not exists name text;
alter table public.love_project_stories add column if not exists social_handle text default '';
alter table public.love_project_stories add column if not exists social_network text null;
alter table public.love_project_stories add column if not exists army_since text default '';
alter table public.love_project_stories add column if not exists city text default '';
alter table public.love_project_stories add column if not exists state text default '';
alter table public.love_project_stories add column if not exists story text;
alter table public.love_project_stories add column if not exists status text default 'pending';
alter table public.love_project_stories add column if not exists source text default 'public';
alter table public.love_project_stories add column if not exists created_at timestamptz default now();
alter table public.love_project_stories add column if not exists updated_at timestamptz default now();
alter table public.love_project_stories add column if not exists published_at timestamptz null;

update public.love_project_stories set status = 'pending' where status is null;
update public.love_project_stories set source = 'public' where source is null;
update public.love_project_stories set created_at = now() where created_at is null;

create index if not exists love_project_stories_status_idx
  on public.love_project_stories(status, published_at desc, created_at desc);
create index if not exists love_project_stories_project_idx
  on public.love_project_stories(project_id);

alter table public.love_project_stories enable row level security;

-- Função pública de envio. Evita conflitos de RLS e diferenças de schema no cliente.
create or replace function public.submit_love_project_story(
  p_project_id uuid,
  p_name text,
  p_social_handle text,
  p_social_network text,
  p_army_since text,
  p_city text,
  p_state text,
  p_story text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_name), '') is null
     or nullif(trim(p_social_handle), '') is null
     or nullif(trim(p_army_since), '') is null
     or nullif(trim(p_city), '') is null
     or nullif(trim(p_state), '') is null
     or nullif(trim(p_story), '') is null then
    raise exception 'Preencha todos os campos obrigatórios.';
  end if;

  if char_length(trim(p_story)) < 20 or char_length(trim(p_story)) > 5000 then
    raise exception 'O relato deve ter entre 20 e 5000 caracteres.';
  end if;

  insert into public.love_project_stories (
    project_id, name, social_handle, social_network, army_since,
    city, state, story, status, source, created_at, updated_at
  ) values (
    p_project_id,
    left(trim(p_name), 100),
    left(trim(p_social_handle), 100),
    nullif(left(trim(coalesce(p_social_network, '')), 100), ''),
    left(trim(p_army_since), 100),
    left(trim(p_city), 100),
    left(trim(p_state), 50),
    trim(p_story),
    'pending',
    'public',
    now(),
    now()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- Função pública de leitura: retorna somente relatos aprovados.
create or replace function public.get_published_love_project_stories(
  p_project_id uuid default null
)
returns table (
  id uuid,
  project_id uuid,
  name text,
  social_handle text,
  social_network text,
  army_since text,
  city text,
  state text,
  story text,
  created_at timestamptz,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id, s.project_id, s.name, s.social_handle, s.social_network,
    s.army_since, s.city, s.state, s.story, s.created_at, s.published_at
  from public.love_project_stories s
  where s.status = 'approved'
    and (p_project_id is null or s.project_id = p_project_id)
  order by coalesce(s.published_at, s.created_at) desc;
$$;

revoke all on function public.submit_love_project_story(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_love_project_story(uuid,text,text,text,text,text,text,text) to anon, authenticated;

revoke all on function public.get_published_love_project_stories(uuid) from public;
grant execute on function public.get_published_love_project_stories(uuid) to anon, authenticated;

-- Mantém acesso administrativo direto à tabela.
grant select, insert, update, delete on public.love_project_stories to authenticated;

-- Políticas administrativas e públicas (idempotentes).
drop policy if exists "Public can submit love stories" on public.love_project_stories;
drop policy if exists "Public can read approved love stories" on public.love_project_stories;
drop policy if exists "Authenticated admins can read love stories" on public.love_project_stories;
drop policy if exists "Authenticated admins can create love stories" on public.love_project_stories;
drop policy if exists "Authenticated admins can update love stories" on public.love_project_stories;
drop policy if exists "Authenticated admins can delete love stories" on public.love_project_stories;

create policy "Public can read approved love stories"
on public.love_project_stories for select to anon
using (status = 'approved');

create policy "Authenticated admins can read love stories"
on public.love_project_stories for select to authenticated using (true);

create policy "Authenticated admins can create love stories"
on public.love_project_stories for insert to authenticated with check (true);

create policy "Authenticated admins can update love stories"
on public.love_project_stories for update to authenticated using (true) with check (true);

create policy "Authenticated admins can delete love stories"
on public.love_project_stories for delete to authenticated using (true);

-- Atualiza o cache de schema do PostgREST.
notify pgrst, 'reload schema';
