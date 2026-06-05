-- BARMY360 atualização final: docs, posts com links, frases com email e storage
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


-- BARMY360 v2 - painel de liberação, frases, solos e envio de artes
alter table if exists public.phrase_submissions add column if not exists phrase_explanation text;
alter table if exists public.site_settings add column if not exists launch_mode text default 'locked';
alter table if exists public.site_settings add column if not exists launch_at text default '2026-06-05T20:00:00-03:00';
alter table if exists public.site_settings add column if not exists handbanner_art_enabled boolean default false;
alter table if exists public.site_settings add column if not exists handbanner_art_title text default 'Enviar arte do Hand Banner';
alter table if exists public.site_settings add column if not exists handbanner_art_text text default 'Envie sua arte seguindo o edital e o manual de submissão.';
create table if not exists public.solo_members (id uuid primary key default gen_random_uuid(), member_name text not null, title text, description text, image_url text, status text default 'planejamento', position int default 0, created_at timestamptz default now());
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
