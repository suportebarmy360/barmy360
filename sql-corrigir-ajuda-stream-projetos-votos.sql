-- BARMY360 - SQL seguro para corrigir tabelas do ADM, Stream, BARMY Ajuda e votação
-- Pode rodar no SQL Editor do Supabase.

-- Extensão para UUID, caso precise
create extension if not exists pgcrypto;

-- Tabelas editáveis do painel ADM
alter table public.community_posts add column if not exists image_url text;
create table if not exists public.help_items (
  id text primary key default gen_random_uuid()::text,
  section_key text default 'outros',
  title text,
  content text,
  image_url text,
  link_url text,
  link_label text,
  position integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.stream_items (
  id text primary key default gen_random_uuid()::text,
  section_key text default 'outros',
  title text,
  description text,
  content text,
  image_url text,
  link_url text,
  link_label text,
  position integer default 0,
  created_at timestamptz default now()
);

-- Garante colunas caso as tabelas já existam
alter table public.help_items add column if not exists section_key text default 'outros';
alter table public.help_items add column if not exists title text;
alter table public.help_items add column if not exists content text;
alter table public.help_items add column if not exists image_url text;
alter table public.help_items add column if not exists link_url text;
alter table public.help_items add column if not exists link_label text;
alter table public.help_items add column if not exists position integer default 0;
alter table public.help_items add column if not exists created_at timestamptz default now();

alter table public.stream_items add column if not exists section_key text default 'outros';
alter table public.stream_items add column if not exists title text;
alter table public.stream_items add column if not exists description text;
alter table public.stream_items add column if not exists content text;
alter table public.stream_items add column if not exists image_url text;
alter table public.stream_items add column if not exists link_url text;
alter table public.stream_items add column if not exists link_label text;
alter table public.stream_items add column if not exists position integer default 0;
alter table public.stream_items add column if not exists created_at timestamptz default now();

-- Tabela de votos sem trava por aparelho e sem foreign key para evitar erro de tipo
create table if not exists public.votos (
  id bigserial primary key,
  opcao_id text not null,
  votacao_id text not null,
  created_at timestamptz default now()
);

alter table public.opcoes_votacao add column if not exists votos_count integer default 0;
alter table public.opcoes_votacao add column if not exists votos integer default 0;

-- Função de voto: aceita tudo como texto para funcionar com UUID ou bigint
-- Não limita por aparelho.
drop function if exists public.registrar_voto_opcao(text, bigint);
drop function if exists public.registrar_voto_opcao(text, text);
drop function if exists public.registrar_voto_opcao(uuid, uuid);

create or replace function public.registrar_voto_opcao(opcao text, votacao text)
returns integer
language plpgsql
security definer
as $$
declare
  total integer;
begin
  update public.opcoes_votacao
  set votos_count = coalesce(votos_count, 0) + 1,
      votos = coalesce(votos, 0) + 1
  where id::text = opcao
  returning votos_count into total;

  insert into public.votos (opcao_id, votacao_id)
  values (opcao, votacao);

  return coalesce(total, 0);
end;
$$;

grant execute on function public.registrar_voto_opcao(text, text) to anon;
grant execute on function public.registrar_voto_opcao(text, text) to authenticated;

-- Conteúdo inicial do BARMY Ajuda
insert into public.help_items (id, section_key, title, content, image_url, link_url, link_label, position)
select 'mapa', 'mapa', 'Mapa do estádio e entradas', 'Espaço para colocar mapa do estádio, entradas, portões, pontos de encontro e observações importantes.', '🗺️ Adicionar imagem', '', 'Abrir página', 1
where not exists (select 1 from public.help_items where section_key = 'mapa');

insert into public.help_items (id, section_key, title, content, image_url, link_url, link_label, position)
select 'setores', 'setores', 'Vista dos setores', 'Espaço para fotos de referência dos setores, visão do palco e explicações para ajudar quem vai ao show.', '📸 Adicionar imagem', '', 'Abrir página', 2
where not exists (select 1 from public.help_items where section_key = 'setores');

insert into public.help_items (id, section_key, title, content, image_url, link_url, link_label, position)
select 'links', 'links', 'Threads no X e posts do Instagram', 'Espaço para organizar links de threads, posts, guias e avisos importantes.', '🧵 Adicionar imagem', '', 'Abrir links', 3
where not exists (select 1 from public.help_items where section_key = 'links');

-- Conteúdo inicial do Stream
insert into public.stream_items (id, section_key, title, description, content, image_url, link_url, link_label, position)
select 'playlists', 'playlists', 'Playlists / plataformas', 'Espaço para colocar playlists de stream.', 'Coloque aqui links de Spotify, YouTube, playlists e orientações de stream.', '🎵 Adicionar imagem', '', 'Acessar plataforma', 1
where not exists (select 1 from public.stream_items where section_key = 'playlists');

insert into public.stream_items (id, section_key, title, description, content, image_url, link_url, link_label, position)
select 'youtube', 'youtube', 'YouTube', 'Guias para views, metas, revezamento e cuidado com spam.', 'Explique aqui como assistir, evitar spam e organizar metas de views.', '▶️ Adicionar imagem', '', 'Abrir guia', 2
where not exists (select 1 from public.stream_items where section_key = 'youtube');

insert into public.stream_items (id, section_key, title, description, content, image_url, link_url, link_label, position)
select 'metas', 'metas', 'Metas', 'Espaço para metas diárias, semanais ou de comeback.', 'Cadastre metas, prioridades e atualizações para a comunidade acompanhar.', '📊 Adicionar imagem', '', 'Ver metas', 3
where not exists (select 1 from public.stream_items where section_key = 'metas');

insert into public.stream_items (id, section_key, title, description, content, image_url, link_url, link_label, position)
select 'tutorial', 'tutorial', 'Guias de stream', 'Tutorial rápido para quem quer ajudar e não sabe por onde começar.', 'Coloque o passo a passo principal para iniciantes.', '⚡ Adicionar imagem', '', 'Ler tutorial', 4
where not exists (select 1 from public.stream_items where section_key = 'tutorial');


-- Restaura/garante o Handbanner como projeto editável no painel ADM.
-- Agora ele NÃO fica fixo no código: precisa existir na tabela projects.
insert into public.projects (title, description, details, image_url, status, voting_open, votes_count)
select 'Handbanner', 'Envie sua frase para participar da seleção do handbanner.', 'As frases serão avaliadas pela equipe. As aprovadas poderão seguir para votação dentro do projeto Handbanner.', '✨ Adicionar imagem', 'em_votacao', true, 0
where not exists (select 1 from public.projects where lower(title) like '%handbanner%');

-- Garante que Ocean Roxo e Mensagem Final existam como projetos editáveis no ADM
insert into public.projects (title, description, details, image_url, status, voting_open, votes_count)
select 'Ocean Roxo', 'Projeto visual para organizar luzes roxas no estádio.', 'Depois da votação, os ADMs definem música, instruções e organização do fandom.', '🌌 Adicionar imagem', 'em_votacao', true, 0
where not exists (select 1 from public.projects where lower(title) = 'ocean roxo');

insert into public.projects (title, description, details, image_url, status, voting_open, votes_count)
select 'Mensagem Final', 'Escolha da frase para ação especial no encerramento.', 'As frases passam por votação até a escolha final.', '💌 Adicionar imagem', 'em_votacao', true, 0
where not exists (select 1 from public.projects where lower(title) = 'mensagem final');

-- Segurança básica para leitura pública e edição por ADM logado
alter table public.help_items enable row level security;
alter table public.stream_items enable row level security;
alter table public.votos enable row level security;

drop policy if exists "public read help items" on public.help_items;
drop policy if exists "auth manage help items" on public.help_items;
create policy "public read help items" on public.help_items for select to anon, authenticated using (true);
create policy "auth manage help items" on public.help_items for all to authenticated using (true) with check (true);

drop policy if exists "public read stream items" on public.stream_items;
drop policy if exists "auth manage stream items" on public.stream_items;
create policy "public read stream items" on public.stream_items for select to anon, authenticated using (true);
create policy "auth manage stream items" on public.stream_items for all to authenticated using (true) with check (true);

drop policy if exists "public insert votos" on public.votos;
drop policy if exists "public read votos" on public.votos;
create policy "public insert votos" on public.votos for insert to anon, authenticated with check (true);
create policy "public read votos" on public.votos for select to anon, authenticated using (true);


-- Correções da versão teste ADM: vínculo de votação por projeto e envio de frases
alter table public.votacoes add column if not exists project_key text default 'handbanner';

update public.votacoes
set project_key = case
  when lower(titulo) like '%ocean%' then 'ocean-roxo'
  when lower(titulo) like '%mensagem%' then 'mensagem-final'
  when lower(titulo) like '%handbanner%' then 'handbanner'
  else coalesce(project_key, 'handbanner')
end;

create table if not exists public.phrase_submissions (
  id bigserial primary key,
  phrase text not null check (char_length(phrase) <= 180),
  author_name text,
  social_handle text,
  created_at timestamptz default now()
);

alter table public.phrase_submissions enable row level security;
alter table public.phrase_submissions add column if not exists project_key text default 'handbanner';

drop policy if exists "public insert phrase submissions" on public.phrase_submissions;
drop policy if exists "auth read phrase submissions" on public.phrase_submissions;
create policy "public insert phrase submissions" on public.phrase_submissions for insert to anon, authenticated with check (true);
create policy "auth read phrase submissions" on public.phrase_submissions for select to authenticated using (true);

-- Garante votações iniciais separadas por projeto.
insert into public.votacoes (titulo, descricao, fase, status, mostrar_ranking, project_key)
select 'Handbanner - Fase 1', 'Votação das opções de handbanner.', 'fase1', 'aberta', true, 'handbanner'
where not exists (select 1 from public.votacoes where project_key = 'handbanner');

insert into public.votacoes (titulo, descricao, fase, status, mostrar_ranking, project_key)
select 'Ocean Roxo', 'Votação das opções do projeto Ocean Roxo.', 'fase1', 'aberta', true, 'ocean-roxo'
where not exists (select 1 from public.votacoes where project_key = 'ocean-roxo');

insert into public.votacoes (titulo, descricao, fase, status, mostrar_ranking, project_key)
select 'Mensagem Final', 'Votação das opções do projeto Mensagem Final.', 'fase1', 'aberta', true, 'mensagem-final'
where not exists (select 1 from public.votacoes where project_key = 'mensagem-final');

-- Ajuste extra: votação por projeto dinâmico + upload de imagens pelo painel ADM
alter table public.votacoes add column if not exists project_key text;
create index if not exists idx_votacoes_project_key on public.votacoes(project_key);

alter table public.opcoes_votacao add column if not exists votos_count integer default 0;
alter table public.opcoes_votacao add column if not exists votos integer default 0;
alter table public.opcoes_votacao add column if not exists imagem text;
alter table public.opcoes_votacao add column if not exists imagem_url text;

-- Função de voto compatível com IDs em texto/uuid/bigint convertidos para texto pelo JS
create or replace function public.registrar_voto_opcao(opcao text, votacao text)
returns integer
language plpgsql
security definer
as $$
declare
  total integer;
begin
  update public.opcoes_votacao
  set votos_count = coalesce(votos_count, 0) + 1,
      votos = coalesce(votos, 0) + 1
  where id::text = opcao
  returning votos_count into total;

  insert into public.votos (opcao_id, votacao_id)
  values (opcao, votacao);

  return coalesce(total, 0);
end;
$$;

grant execute on function public.registrar_voto_opcao(text, text) to anon;
grant execute on function public.registrar_voto_opcao(text, text) to authenticated;

-- Bucket público para imagens enviadas no painel ADM
insert into storage.buckets (id, name, public)
values ('barmy360-images', 'barmy360-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read barmy360 images" on storage.objects;
drop policy if exists "auth upload barmy360 images" on storage.objects;
drop policy if exists "auth update barmy360 images" on storage.objects;
drop policy if exists "auth delete barmy360 images" on storage.objects;

create policy "public read barmy360 images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'barmy360-images');

create policy "auth upload barmy360 images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'barmy360-images');

create policy "auth update barmy360 images"
on storage.objects for update
to authenticated
using (bucket_id = 'barmy360-images')
with check (bucket_id = 'barmy360-images');

create policy "auth delete barmy360 images"
on storage.objects for delete
to authenticated
using (bucket_id = 'barmy360-images');


-- Campo opcional para fotos adicionais nas páginas internas do BARMY Ajuda
alter table if exists public.help_items
add column if not exists extra_images text;
