-- Patch BARMY360: Projetos Individuais + campos editáveis da página
-- Rode este arquivo no SQL Editor do Supabase.

alter table public.site_settings
  add column if not exists solo_page_kicker text default 'PROJETOS INDIVIDUAIS',
  add column if not exists solo_page_title text default 'Projetos por membro',
  add column if not exists solo_page_text text default 'Espaço reservado para projetos individuais.',
  add column if not exists solo_detail_kicker text default 'PROJETO INDIVIDUAL';

alter table public.solo_members
  add column if not exists cover_image text,
  add column if not exists image_url text,
  add column if not exists status text default 'planejamento',
  add column if not exists position integer default 0;

alter table public.solo_projects
  add column if not exists cover_image text,
  add column if not exists image_url text,
  add column if not exists link_url text,
  add column if not exists status text default 'planejamento',
  add column if not exists position integer default 0;

update public.site_settings
set solo_page_kicker = coalesce(solo_page_kicker, 'PROJETOS INDIVIDUAIS'),
    solo_page_title = coalesce(solo_page_title, 'Projetos por membro'),
    solo_page_text = coalesce(solo_page_text, 'Espaço reservado para projetos individuais.'),
    solo_detail_kicker = coalesce(solo_detail_kicker, 'PROJETO INDIVIDUAL')
where id = 1;

-- Renomeia status antigo para o novo rótulo de colaboração.
update public.solo_members set status = 'em_colaboracao' where status = 'aprovado';
update public.solo_projects set status = 'em_colaboracao' where status = 'aprovado';
update public.projects set status = 'em_colaboracao' where status = 'aprovado';

notify pgrst, 'reload schema';
