-- BARMY360 - PATCH DA VOTAÇÃO DE HAND BANNER POR SEÇÕES
-- Use apenas se o banco já foi criado antes desta versão.
-- Se você rodar o 00_instalacao.sql desta versão em um Supabase novo, este patch não é obrigatório.

alter table public.site_settings add column if not exists handbanner_vote_title text default 'Votação do Hand Banner';
alter table public.site_settings add column if not exists handbanner_vote_description text default 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.';
alter table public.site_settings add column if not exists handbanner_vote_cover_image text;
alter table public.site_settings add column if not exists handbanner_vote_card_image text;
alter table public.site_settings add column if not exists handbanner_vote_section_title text default 'Escolha 1 arte em cada frase';
alter table public.site_settings add column if not exists handbanner_vote_section_description text default 'É obrigatório votar nas três frases para confirmar.';
alter table public.site_settings add column if not exists handbanner_vote_important_cards text default 'Obrigatório votar nas três frases
Selecione uma arte em cada seção antes de confirmar.

Confirmação final
O voto só é enviado após clicar em Confirmar votos.';
alter table public.site_settings add column if not exists handbanner_vote_confirm_text text default 'Revise suas escolhas antes de confirmar. Depois de enviado, o voto não poderá ser alterado.';
alter table public.site_settings add column if not exists handbanner_vote_phrase_1 text default 'Frase 1';
alter table public.site_settings add column if not exists handbanner_vote_phrase_2 text default 'Frase 2';
alter table public.site_settings add column if not exists handbanner_vote_phrase_3 text default 'Frase 3';
alter table public.site_settings add column if not exists handbanner_vote_restriction_mode text default 'fingerprint';
alter table public.site_settings add column if not exists handbanner_vote_restriction_label text default '1 voto por navegador/dispositivo';
alter table public.site_settings add column if not exists handbanner_vote_limit_per_phrase integer default 1;


alter table public.votacoes add column if not exists project_key text;
create unique index if not exists votacoes_project_key_unique on public.votacoes(project_key) where project_key is not null;

alter table public.opcoes_votacao add column if not exists hb_frase integer;
alter table public.opcoes_votacao add column if not exists hb_phrase_group text;
alter table public.opcoes_votacao add column if not exists position integer default 0;
alter table public.opcoes_votacao add column if not exists imagem_url text;
alter table public.opcoes_votacao add column if not exists imagem text;
alter table public.opcoes_votacao add column if not exists votos_count integer default 0;
alter table public.opcoes_votacao add column if not exists votos integer default 0;

alter table public.votos_opcao add column if not exists voter_fingerprint text;
alter table public.votos_opcao add column if not exists voter_ip text;
alter table public.votos_opcao add column if not exists user_agent text;

insert into public.projects (project_key, title, description, details, status, voting_open, position)
select 'handbanner-votacao', 'Votação Hand Banner', 'Vote nas artes oficiais do hand banner.', 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.', 'em_votacao', true, 1
where not exists (select 1 from public.projects where project_key = 'handbanner-votacao');

insert into public.votacoes (project_key, titulo, descricao, fase, status, mostrar_ranking)
select 'handbanner-votacao', 'Votação do Hand Banner', 'Escolha uma arte para cada frase. O voto só será enviado depois da confirmação final.', 'handbanner', 'aberta', false
where not exists (select 1 from public.votacoes where project_key = 'handbanner-votacao');

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

-- Publicação manual da página/card de votação de handbanner
alter table public.site_settings add column if not exists handbanner_vote_published boolean default false;
update public.site_settings set handbanner_vote_published = coalesce(handbanner_vote_published, false) where id = 1;

-- Começa como rascunho para você postar depois pelo painel ADM
update public.projects set status = coalesce(status, 'rascunho') where project_key = 'handbanner-votacao';
