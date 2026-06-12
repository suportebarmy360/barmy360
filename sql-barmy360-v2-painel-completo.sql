
alter table if exists public.community_posts add column if not exists image_url text;
alter table if exists public.community_posts add column if not exists link_url text;
alter table if exists public.community_posts add column if not exists link_label text;
alter table if exists public.phrase_submissions add column if not exists contact_email text;
alter table if exists public.projects add column if not exists project_key text;
alter table if exists public.votacoes add column if not exists project_key text;
alter table if exists public.help_items add column if not exists extra_images text;
alter table if exists public.site_documents add column if not exists cover_image text;
alter table if exists public.site_documents add column if not exists image_url text;
create table if not exists public.site_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  download_url text,
  category text default 'documento',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.site_documents enable row level security;
drop policy if exists "site_documents_read" on public.site_documents;
create policy "site_documents_read" on public.site_documents for select using (true);
drop policy if exists "site_documents_admin_all" on public.site_documents;
create policy "site_documents_admin_all" on public.site_documents for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
insert into public.site_documents (title, description, category, position)
select 'Termo de ciência e concordância', 'Documento para leitura antes das votações oficiais.', 'documento', 1
where not exists (select 1 from public.site_documents where title = 'Termo de ciência e concordância');


alter table if exists public.phrase_submissions add column if not exists phrase_explanation text;
alter table if exists public.site_settings add column if not exists launch_mode text default 'open';
alter table if exists public.site_settings add column if not exists launch_at text default '2026-06-05T20:00:00-03:00';
alter table if exists public.site_settings add column if not exists handbanner_art_enabled boolean default false;
alter table if exists public.site_settings add column if not exists handbanner_art_title text default 'Enviar arte do Hand Banner';
alter table if exists public.site_settings add column if not exists handbanner_art_text text default 'Envie sua arte seguindo o edital e o manual de submissão.';
create table if not exists public.solo_members (id uuid primary key default gen_random_uuid(), member_name text not null, title text, description text, image_url text, cover_image text, status text default 'planejamento', position int default 0, created_at timestamptz default now());
alter table public.solo_members enable row level security;
drop policy if exists "solo_members_read" on public.solo_members; create policy "solo_members_read" on public.solo_members for select using (true);
drop policy if exists "solo_members_admin_all" on public.solo_members; create policy "solo_members_admin_all" on public.solo_members for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create table if not exists public.handbanner_art_submissions (id uuid primary key default gen_random_uuid(), user_id uuid not null, google_email text, full_name text not null, social_handle text not null, contact_email text not null, cloud_link text not null, term_agreement_link text, minor_authorization_link text, agree_term boolean default false, agree_minor boolean default false, agree_rules boolean default false, observation text, created_at timestamptz default now());
alter table public.handbanner_art_submissions enable row level security;
drop policy if exists "handbanner_insert_own" on public.handbanner_art_submissions; create policy "handbanner_insert_own" on public.handbanner_art_submissions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "handbanner_read_admin" on public.handbanner_art_submissions; create policy "handbanner_read_admin" on public.handbanner_art_submissions for select to authenticated using (true);
insert into public.solo_members (member_name,title,description,status,position)
select * from (values ('RM','RM','Projeto solo em breve.','planejamento',1),('Jin','Jin','Projeto solo em breve.','planejamento',2),('SUGA','SUGA','Projeto solo em breve.','planejamento',3),('j-hope','j-hope','Projeto solo em breve.','planejamento',4),('Jimin','Jimin','Projeto solo em breve.','planejamento',5),('V','V','Projeto solo em breve.','planejamento',6),('Jung Kook','Jung Kook','Projeto solo em breve.','planejamento',7)) as v(member_name,title,description,status,position)
where not exists (select 1 from public.solo_members);

alter table if exists public.solo_members add column if not exists cover_image text;
alter table if exists public.solo_projects add column if not exists cover_image text;

-- Projetos Solos: cards de projetos dentro da página de cada membro
create table if not exists public.solo_projects (
  id uuid primary key default gen_random_uuid(),
  solo_member_id uuid references public.solo_members(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  cover_image text,
  link_url text,
  status text default 'planejamento',
  position int default 0,
  created_at timestamptz default now()
);
alter table public.solo_projects enable row level security;
drop policy if exists "solo_projects_read" on public.solo_projects;
create policy "solo_projects_read" on public.solo_projects for select using (true);
drop policy if exists "solo_projects_admin_all" on public.solo_projects;
create policy "solo_projects_admin_all" on public.solo_projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


-- BARMY360_FINAL_PATCH_20260611
insert into public.site_settings (id, launch_mode, launch_at, contact_email)
values (1, 'open', '2026-06-05T20:00:00-03:00', 'projeto.barmy360@gmail.com')
on conflict (id) do update set
  launch_mode = 'open',
  contact_email = 'projeto.barmy360@gmail.com';

-- BARMY360_PATCH_VOTACAO_LIMITADA_20260612
create table if not exists public.votos_opcao (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.votacoes(id) on delete cascade,
  opcao_id uuid not null references public.opcoes_votacao(id) on delete cascade,
  voter_fingerprint text,
  voter_ip text,
  user_agent text,
  created_at timestamptz default now()
);
alter table public.votos_opcao enable row level security;
drop policy if exists "votos_opcao_no_public_read" on public.votos_opcao;
create policy "votos_opcao_no_public_read" on public.votos_opcao for select using (false);
drop policy if exists "votos_opcao_insert_public" on public.votos_opcao;
create policy "votos_opcao_insert_public" on public.votos_opcao for insert with check (true);
create unique index if not exists votos_opcao_unico_fingerprint_opcao on public.votos_opcao (votacao_id, opcao_id, voter_fingerprint) where voter_fingerprint is not null and voter_fingerprint <> '';
create unique index if not exists votos_opcao_unico_ip_opcao on public.votos_opcao (votacao_id, opcao_id, voter_ip) where voter_ip is not null and voter_ip <> '';
create or replace function public.registrar_voto_opcao(opcao text, votacao text, voter_fingerprint text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare opcao_uuid uuid := opcao::uuid; votacao_uuid uuid := votacao::uuid; votacao_status text; headers_raw text; headers_json jsonb := '{}'::jsonb; voter_ip_value text := null; user_agent_value text := null; votos_atuais integer := 0; novo_total integer := 0;
begin
  select status into votacao_status from public.votacoes where id = votacao_uuid;
  if votacao_status is null then raise exception 'Votação não encontrada.'; end if;
  if votacao_status <> 'aberta' then raise exception 'Esta votação está fechada.'; end if;
  begin headers_raw := current_setting('request.headers', true); if headers_raw is not null and headers_raw <> '' then headers_json := headers_raw::jsonb; end if; exception when others then headers_json := '{}'::jsonb; end;
  voter_ip_value := nullif(trim(split_part(coalesce(headers_json->>'x-forwarded-for', headers_json->>'cf-connecting-ip', headers_json->>'x-real-ip', ''), ',', 1)), '');
  user_agent_value := nullif(headers_json->>'user-agent', ''); voter_fingerprint := nullif(trim(coalesce(voter_fingerprint, '')), '');
  if not exists (select 1 from public.opcoes_votacao where id = opcao_uuid and votacao_id = votacao_uuid) then raise exception 'Opção inválida para esta votação.'; end if;
  if exists (select 1 from public.votos_opcao where votacao_id = votacao_uuid and opcao_id = opcao_uuid and ((voter_fingerprint is not null and votos_opcao.voter_fingerprint = voter_fingerprint) or (voter_ip_value is not null and votos_opcao.voter_ip = voter_ip_value))) then raise exception 'Você já votou nessa opção.'; end if;
  select count(distinct opcao_id) into votos_atuais from public.votos_opcao where votacao_id = votacao_uuid and ((voter_fingerprint is not null and votos_opcao.voter_fingerprint = voter_fingerprint) or (voter_ip_value is not null and votos_opcao.voter_ip = voter_ip_value));
  if votos_atuais >= 3 then raise exception 'Limite de 3 opções por votação atingido.'; end if;
  insert into public.votos_opcao (votacao_id, opcao_id, voter_fingerprint, voter_ip, user_agent) values (votacao_uuid, opcao_uuid, voter_fingerprint, voter_ip_value, user_agent_value);
  update public.opcoes_votacao o set votos_count = (select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid) where o.id = opcao_uuid returning votos_count into novo_total;
  return coalesce(novo_total, 0);
exception when unique_violation then raise exception 'Você já votou nessa opção.';
end; $$;
grant execute on function public.registrar_voto_opcao(text, text, text) to anon, authenticated;
