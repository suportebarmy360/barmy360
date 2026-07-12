-- BARMY360 - SETUP COMPLETO PARA SUPABASE NOVO
-- Rode este arquivo inteiro no SQL Editor do projeto novo.
-- Depois crie o usuário ADM em Authentication > Users.

create extension if not exists pgcrypto;

-- STORAGE
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('barmy360-images', 'barmy360-images', true, 10485760, null)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('handbanners', 'handbanners', true, 10485760, null)
on conflict (id) do update set public = true;

drop policy if exists "barmy360_images_public_read" on storage.objects;
create policy "barmy360_images_public_read" on storage.objects for select using (bucket_id in ('barmy360-images','handbanners'));
drop policy if exists "barmy360_images_admin_insert" on storage.objects;
create policy "barmy360_images_admin_insert" on storage.objects for insert to authenticated with check (bucket_id in ('barmy360-images','handbanners'));
drop policy if exists "barmy360_images_admin_update" on storage.objects;
create policy "barmy360_images_admin_update" on storage.objects for update to authenticated using (bucket_id in ('barmy360-images','handbanners')) with check (bucket_id in ('barmy360-images','handbanners'));
drop policy if exists "barmy360_images_admin_delete" on storage.objects;
create policy "barmy360_images_admin_delete" on storage.objects for delete to authenticated using (bucket_id in ('barmy360-images','handbanners'));

-- CONFIGURAÇÕES GERAIS
create table if not exists public.site_settings (
  id integer primary key default 1,
  launch_mode text default 'open',
  launch_at text default '2026-06-05T20:00:00-03:00',
  contact_email text default 'projeto.barmy360@gmail.com',
  handbanner_art_enabled boolean default false,
  handbanner_art_title text default 'Enviar arte do Hand Banner',
  handbanner_art_text text default 'Envie sua arte seguindo o edital e o manual de submissão.',
  handbanner_vote_title text default 'Votação do Hand Banner',
  handbanner_vote_description text default 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.',
  handbanner_vote_cover_image text,
  handbanner_vote_card_image text,
  handbanner_vote_section_title text default 'Escolha 1 arte em cada frase',
  handbanner_vote_section_description text default 'É obrigatório votar nas três frases para confirmar.',
  handbanner_vote_important_cards text default 'Obrigatório votar nas três frases\nSelecione uma arte em cada seção antes de confirmar.\n\nConfirmação final\nO voto só é enviado após clicar em Confirmar votos.',
  handbanner_vote_confirm_text text default 'Revise suas escolhas antes de confirmar. Depois de enviado, o voto não poderá ser alterado.',
  handbanner_vote_phrase_1 text default 'Frase 1',
  handbanner_vote_phrase_2 text default 'Frase 2',
  handbanner_vote_phrase_3 text default 'Frase 3',
  handbanner_vote_limit_per_phrase integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "site_settings_read" on public.site_settings;
create policy "site_settings_read" on public.site_settings for select using (true);
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all" on public.site_settings for all to authenticated using (true) with check (true);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- COMUNIDADE / POSTS
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  author text default 'ADM',
  image_url text,
  link_url text,
  link_label text,
  status text default 'publicado',
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.community_posts enable row level security;
drop policy if exists "community_posts_read" on public.community_posts;
create policy "community_posts_read" on public.community_posts for select using (true);
drop policy if exists "community_posts_admin_all" on public.community_posts;
create policy "community_posts_admin_all" on public.community_posts for all to authenticated using (true) with check (true);

-- PROJETOS
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_key text unique,
  title text not null,
  description text,
  details text,
  image_url text,
  cover_image text,
  status text default 'em_votacao',
  voting_open boolean default false,
  votes_count integer default 0,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.projects enable row level security;
drop policy if exists "projects_read" on public.projects;
create policy "projects_read" on public.projects for select using (true);
drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all" on public.projects for all to authenticated using (true) with check (true);

-- VOTAÇÕES E OPÇÕES
create table if not exists public.votacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  fase text default 'fase1',
  status text default 'aberta',
  mostrar_ranking boolean default true,
  mostrar_resultado boolean default true,
  project_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists votacoes_project_key_unique on public.votacoes(project_key) where project_key is not null;
alter table public.votacoes enable row level security;
drop policy if exists "votacoes_read" on public.votacoes;
create policy "votacoes_read" on public.votacoes for select using (true);
drop policy if exists "votacoes_admin_all" on public.votacoes;
create policy "votacoes_admin_all" on public.votacoes for all to authenticated using (true) with check (true);

create table if not exists public.opcoes_votacao (
  id uuid primary key default gen_random_uuid(),
  votacao_id uuid not null references public.votacoes(id) on delete cascade,
  titulo text not null,
  descricao text,
  imagem_url text,
  imagem text,
  votos_count integer default 0,
  votos integer default 0,
  hb_frase integer,
  hb_phrase_group text,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.opcoes_votacao enable row level security;
drop policy if exists "opcoes_votacao_read" on public.opcoes_votacao;
create policy "opcoes_votacao_read" on public.opcoes_votacao for select using (true);
drop policy if exists "opcoes_votacao_admin_all" on public.opcoes_votacao;
create policy "opcoes_votacao_admin_all" on public.opcoes_votacao for all to authenticated using (true) with check (true);

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
drop policy if exists "votos_opcao_admin_read" on public.votos_opcao;
create policy "votos_opcao_admin_read" on public.votos_opcao for select to authenticated using (true);
create unique index if not exists votos_opcao_unico_fingerprint_opcao on public.votos_opcao (votacao_id, opcao_id, voter_fingerprint) where voter_fingerprint is not null and voter_fingerprint <> '';

-- ENVIO DE FRASES
create table if not exists public.phrase_submissions (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,
  phrase_explanation text,
  author_name text,
  social_handle text,
  contact_email text,
  status text default 'recebida',
  created_at timestamptz default now()
);
alter table public.phrase_submissions enable row level security;
drop policy if exists "phrase_submissions_insert_public" on public.phrase_submissions;
create policy "phrase_submissions_insert_public" on public.phrase_submissions for insert with check (true);
drop policy if exists "phrase_submissions_admin_read" on public.phrase_submissions;
create policy "phrase_submissions_admin_read" on public.phrase_submissions for select to authenticated using (true);
drop policy if exists "phrase_submissions_admin_all" on public.phrase_submissions;
create policy "phrase_submissions_admin_all" on public.phrase_submissions for all to authenticated using (true) with check (true);

-- ENVIO DE ARTES DO HANDBANNER
create table if not exists public.handbanner_art_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  google_email text,
  full_name text not null,
  social_handle text not null,
  contact_email text not null,
  cloud_link text not null,
  term_agreement_link text,
  minor_authorization_link text,
  agree_term boolean default false,
  agree_minor boolean default false,
  agree_rules boolean default false,
  observation text,
  device_id text,
  created_at timestamptz default now()
);
alter table public.handbanner_art_submissions enable row level security;
drop policy if exists "handbanner_art_insert_public" on public.handbanner_art_submissions;
create policy "handbanner_art_insert_public" on public.handbanner_art_submissions for insert with check (true);
drop policy if exists "handbanner_art_admin_all" on public.handbanner_art_submissions;
create policy "handbanner_art_admin_all" on public.handbanner_art_submissions for all to authenticated using (true) with check (true);

-- AJUDA / DOCUMENTOS / STREAM
create table if not exists public.help_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content text,
  image_url text,
  extra_images text,
  link_url text,
  link_label text,
  section_key text,
  category text default 'ajuda',
  status text default 'publicado',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.help_items enable row level security;
drop policy if exists "help_items_read" on public.help_items;
create policy "help_items_read" on public.help_items for select using (true);
drop policy if exists "help_items_admin_all" on public.help_items;
create policy "help_items_admin_all" on public.help_items for all to authenticated using (true) with check (true);

create table if not exists public.stream_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content text,
  image_url text,
  link_url text,
  link_label text,
  section_key text,
  category text default 'stream',
  status text default 'publicado',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.stream_items enable row level security;
drop policy if exists "stream_items_read" on public.stream_items;
create policy "stream_items_read" on public.stream_items for select using (true);
drop policy if exists "stream_items_admin_all" on public.stream_items;
create policy "stream_items_admin_all" on public.stream_items for all to authenticated using (true) with check (true);

create table if not exists public.site_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text,
  download_url text,
  link_url text,
  cover_image text,
  image_url text,
  category text default 'documento',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.site_documents enable row level security;
drop policy if exists "site_documents_read" on public.site_documents;
create policy "site_documents_read" on public.site_documents for select using (true);
drop policy if exists "site_documents_admin_all" on public.site_documents;
create policy "site_documents_admin_all" on public.site_documents for all to authenticated using (true) with check (true);

-- PROJETOS INDIVIDUAIS
create table if not exists public.solo_members (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  title text,
  description text,
  image_url text,
  cover_image text,
  status text default 'planejamento',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.solo_members enable row level security;
drop policy if exists "solo_members_read" on public.solo_members;
create policy "solo_members_read" on public.solo_members for select using (true);
drop policy if exists "solo_members_admin_all" on public.solo_members;
create policy "solo_members_admin_all" on public.solo_members for all to authenticated using (true) with check (true);

create table if not exists public.solo_projects (
  id uuid primary key default gen_random_uuid(),
  solo_member_id uuid references public.solo_members(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  cover_image text,
  link_url text,
  status text default 'planejamento',
  position integer default 0,
  created_at timestamptz default now()
);
alter table public.solo_projects enable row level security;
drop policy if exists "solo_projects_read" on public.solo_projects;
create policy "solo_projects_read" on public.solo_projects for select using (true);
drop policy if exists "solo_projects_admin_all" on public.solo_projects;
create policy "solo_projects_admin_all" on public.solo_projects for all to authenticated using (true) with check (true);

-- FUNÇÕES DE VOTO
create or replace function public.registrar_voto_opcao(opcao text, votacao text, voter_fingerprint text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  opcao_uuid uuid := opcao::uuid;
  votacao_uuid uuid := votacao::uuid;
  votacao_status text;
  fp text := nullif(trim(coalesce(voter_fingerprint, '')), '');
  novo_total integer := 0;
begin
  select status into votacao_status from public.votacoes where id = votacao_uuid;
  if votacao_status is null then raise exception 'Votação não encontrada.'; end if;
  if votacao_status <> 'aberta' then raise exception 'Esta votação está fechada.'; end if;
  if not exists (select 1 from public.opcoes_votacao where id = opcao_uuid and votacao_id = votacao_uuid) then raise exception 'Opção inválida para esta votação.'; end if;
  if exists (select 1 from public.votos_opcao where public.votos_opcao.votacao_id = votacao_uuid and public.votos_opcao.opcao_id = opcao_uuid and public.votos_opcao.voter_fingerprint = fp) then raise exception 'Você já votou nessa opção.'; end if;
  if (select count(distinct opcao_id) from public.votos_opcao where public.votos_opcao.votacao_id = votacao_uuid and public.votos_opcao.voter_fingerprint = fp) >= 3 then raise exception 'Limite de 3 opções por votação atingido.'; end if;
  insert into public.votos_opcao (votacao_id, opcao_id, voter_fingerprint) values (votacao_uuid, opcao_uuid, fp);
  update public.opcoes_votacao o set votos_count = (select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid), votos = (select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid) where o.id = opcao_uuid returning votos_count into novo_total;
  return coalesce(novo_total, 0);
exception when unique_violation then raise exception 'Você já votou nessa opção.';
end; $$;
grant execute on function public.registrar_voto_opcao(text, text, text) to anon, authenticated;

create or replace function public.registrar_votos_handbanner_confirmados(votacao text, opcoes text[], voter_fingerprint text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  votacao_uuid uuid := votacao::uuid;
  opcao_uuid uuid;
  fp text := nullif(trim(coalesce(voter_fingerprint, '')), '');
  votacao_status text;
  restriction_mode text := 'fingerprint';
  limite_por_frase integer := 1;
  total_opcoes integer := coalesce(array_length(opcoes, 1), 0);
  qtd_distintas integer;
  frase_atual integer;
  qtd_frase integer;
  request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  client_ip text := nullif(split_part(coalesce(request_headers->>'x-forwarded-for', request_headers->>'cf-connecting-ip', request_headers->>'x-real-ip', ''), ',', 1), '');
  client_ua text := nullif(coalesce(request_headers->>'user-agent', ''), '');
begin
  if fp is null then
    raise exception 'Dispositivo não identificado. Atualize a página e tente novamente.';
  end if;

  if total_opcoes < 3 then
    raise exception 'É obrigatório escolher pelo menos 1 arte em cada frase.';
  end if;

  select status into votacao_status
  from public.votacoes
  where id = votacao_uuid;

  if votacao_status is null then raise exception 'Votação não encontrada.'; end if;
  if votacao_status <> 'aberta' then raise exception 'Esta votação está fechada.'; end if;

  select
    coalesce(handbanner_vote_restriction_mode, 'fingerprint'),
    greatest(1, least(20, coalesce(handbanner_vote_limit_per_phrase, 1)))
  into restriction_mode, limite_por_frase
  from public.site_settings
  where id = 1;

  select count(distinct x::uuid) into qtd_distintas
  from unnest(opcoes) as x;

  if qtd_distintas <> total_opcoes then
    raise exception 'Não é permitido enviar a mesma arte repetida.';
  end if;

  if total_opcoes > (limite_por_frase * 3) then
    raise exception 'Você selecionou mais artes do que o limite permitido.';
  end if;

  if restriction_mode = 'ip' then
    if client_ip is not null and exists (
      select 1 from public.votos_opcao vo
      where vo.votacao_id = votacao_uuid and vo.voter_ip = client_ip
    ) then
      raise exception 'Já existe voto confirmado nesta rede/IP.';
    end if;
    if client_ip is null and exists (
      select 1 from public.votos_opcao vo
      where vo.votacao_id = votacao_uuid and vo.voter_fingerprint = fp
    ) then
      raise exception 'Você já confirmou seus votos nesta votação.';
    end if;
  elsif restriction_mode = 'strict' then
    if exists (
      select 1 from public.votos_opcao vo
      where vo.votacao_id = votacao_uuid
        and (vo.voter_fingerprint = fp or (client_ip is not null and vo.voter_ip = client_ip))
    ) then
      raise exception 'Você já confirmou seus votos nesta votação.';
    end if;
  else
    if exists (
      select 1 from public.votos_opcao vo
      where vo.votacao_id = votacao_uuid and vo.voter_fingerprint = fp
    ) then
      raise exception 'Você já confirmou seus votos nesta votação.';
    end if;
  end if;

  for frase_atual in 1..3 loop
    select count(*) into qtd_frase
    from public.opcoes_votacao ov
    where ov.votacao_id = votacao_uuid
      and ov.hb_frase = frase_atual
      and ov.id in (select x::uuid from unnest(opcoes) as x);

    if qtd_frase < 1 then
      raise exception 'Falta escolher pelo menos 1 arte na Frase %.', frase_atual;
    end if;
    if qtd_frase > limite_por_frase then
      raise exception 'A Frase % permite no máximo % escolha(s).', frase_atual, limite_por_frase;
    end if;
  end loop;

  foreach opcao_uuid in array (select array_agg(x::uuid) from unnest(opcoes) as x)
  loop
    if not exists (select 1 from public.opcoes_votacao ov where ov.id = opcao_uuid and ov.votacao_id = votacao_uuid and ov.hb_frase in (1,2,3)) then
      raise exception 'Uma das artes selecionadas não pertence a esta votação.';
    end if;

    insert into public.votos_opcao (votacao_id, opcao_id, voter_fingerprint, voter_ip, user_agent)
    values (votacao_uuid, opcao_uuid, fp, client_ip, client_ua);

    update public.opcoes_votacao o
      set votos_count = (select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid),
          votos = (select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid)
      where o.id = opcao_uuid;
  end loop;

  return true;
end; $$;
grant execute on function public.registrar_votos_handbanner_confirmados(text, text[], text) to anon, authenticated;

-- DADOS INICIAIS
insert into public.solo_members (member_name,title,description,status,position)
select * from (values
  ('RM','RM','Projeto individual em breve.','planejamento',1),
  ('Jin','Jin','Projeto individual em breve.','planejamento',2),
  ('SUGA','SUGA','Projeto individual em breve.','planejamento',3),
  ('j-hope','j-hope','Projeto individual em breve.','planejamento',4),
  ('Jimin','Jimin','Projeto individual em breve.','planejamento',5),
  ('V','V','Projeto individual em breve.','planejamento',6),
  ('Jung Kook','Jung Kook','Projeto individual em breve.','planejamento',7)
) as v(member_name,title,description,status,position)
where not exists (select 1 from public.solo_members);

insert into public.site_documents (title, description, file_url, download_url, cover_image, category, position)
select * from (values
  ('Edital do Projeto Hand Banner', 'Edital completo com regras, fases e diretrizes do projeto.', 'assets/docs/edital-hand-banner-barmy360.pdf', 'assets/docs/edital-hand-banner-barmy360.pdf', 'assets/images/b360-iso.png', 'documento', 1),
  ('Manual de submissão do Hand Banner', 'Guia para preparar e enviar os arquivos corretamente.', 'assets/docs/manual-submissao-hand-banner.pdf', 'assets/docs/manual-submissao-hand-banner.pdf', 'assets/images/b360-iso.png', 'documento', 2),
  ('Termo de ciência e concordância', 'Documento para leitura antes das votações oficiais.', 'assets/docs/termo-ciencia-concordancia-votacao.docx', 'assets/docs/termo-ciencia-concordancia-votacao.docx', 'assets/images/b360-iso.png', 'documento', 3)
) as d(title, description, file_url, download_url, cover_image, category, position)
where not exists (select 1 from public.site_documents);

-- Card e votação base do Hand Banner
insert into public.projects (project_key, title, description, details, status, voting_open, position)
select 'handbanner-votacao', 'Votação Hand Banner', 'Vote nas artes oficiais do hand banner.', 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.', 'em_votacao', true, 1
where not exists (
  select 1 from public.projects where project_key = 'handbanner-votacao'
);

insert into public.votacoes (project_key, titulo, descricao, fase, status, mostrar_ranking)
select 'handbanner-votacao', 'Votação do Hand Banner', 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.', 'handbanner', 'aberta', false
where not exists (
  select 1 from public.votacoes where project_key = 'handbanner-votacao'
);

-- Ajuste Handbanner: controle para postar a página depois pelo ADM
alter table public.site_settings add column if not exists handbanner_vote_published boolean default false;


-- BARMY360 - ESTATÍSTICAS DE ACESSOS E PAINEL ADM
-- Rode este arquivo no SQL Editor do Supabase da versão já instalada.

create table if not exists public.site_accesses (
  id bigint generated by default as identity primary key,
  page_path text not null,
  visitor_fingerprint text,
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists site_accesses_page_idx on public.site_accesses(page_path);
create index if not exists site_accesses_created_idx on public.site_accesses(created_at desc);
create index if not exists site_accesses_visitor_idx on public.site_accesses(visitor_fingerprint);

alter table public.site_accesses enable row level security;
drop policy if exists "site_accesses_no_public_read" on public.site_accesses;
create policy "site_accesses_no_public_read" on public.site_accesses for select using (false);
drop policy if exists "site_accesses_admin_read" on public.site_accesses;
create policy "site_accesses_admin_read" on public.site_accesses for select to authenticated using (true);

create or replace function public.registrar_acesso_site(pagina text, visitante text default null, referencia text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  ua text := nullif(coalesce(request_headers->>'user-agent',''), '');
begin
  if nullif(trim(coalesce(pagina,'')), '') is null then return false; end if;
  insert into public.site_accesses(page_path, visitor_fingerprint, referrer, user_agent)
  values (left(trim(pagina),160), left(nullif(trim(coalesce(visitante,'')),''),160), left(nullif(trim(coalesce(referencia,'')),''),500), left(ua,500));
  return true;
end;
$$;
grant execute on function public.registrar_acesso_site(text,text,text) to anon, authenticated;
