-- BARMY360 — HAND BANNER FASES 2 E 3
-- Execute uma vez no SQL Editor do Supabase antes de publicar o novo ZIP.

alter table public.site_settings add column if not exists handbanner_vote_phase2_title text default 'Hand Banner — Fase 2';
alter table public.site_settings add column if not exists handbanner_vote_phase2_description text default 'Escolha exatamente 3 artes em cada frase, totalizando 9 votos.';
alter table public.site_settings add column if not exists handbanner_vote_phase2_cover_image text;
alter table public.site_settings add column if not exists handbanner_vote_phase2_card_image text;
alter table public.site_settings add column if not exists handbanner_vote_phase2_section_title text default 'Escolha 3 artes em cada frase';
alter table public.site_settings add column if not exists handbanner_vote_phase2_section_description text default 'É obrigatório escolher exatamente 3 artes em cada frase, totalizando 9 votos.';
alter table public.site_settings add column if not exists handbanner_vote_phase2_important_cards text;
alter table public.site_settings add column if not exists handbanner_vote_phase2_confirm_text text;
alter table public.site_settings add column if not exists handbanner_vote_phase2_phrase_1 text default 'Frase 1';
alter table public.site_settings add column if not exists handbanner_vote_phase2_phrase_2 text default 'Frase 2';
alter table public.site_settings add column if not exists handbanner_vote_phase2_phrase_3 text default 'Frase 3';
alter table public.site_settings add column if not exists handbanner_vote_phase2_restriction_mode text default 'fingerprint';
alter table public.site_settings add column if not exists handbanner_vote_phase2_restriction_label text default '1 voto por navegador/dispositivo';
alter table public.site_settings add column if not exists handbanner_vote_phase2_limit_per_phrase integer default 3;
alter table public.site_settings add column if not exists handbanner_vote_phase2_published boolean default false;

alter table public.site_settings add column if not exists handbanner_vote_phase3_title text default 'Hand Banner — Fase 3';
alter table public.site_settings add column if not exists handbanner_vote_phase3_description text default 'Escolha 1 arte em cada frase, totalizando 3 votos.';
alter table public.site_settings add column if not exists handbanner_vote_phase3_cover_image text;
alter table public.site_settings add column if not exists handbanner_vote_phase3_card_image text;
alter table public.site_settings add column if not exists handbanner_vote_phase3_section_title text default 'Escolha 1 arte em cada frase';
alter table public.site_settings add column if not exists handbanner_vote_phase3_section_description text default 'É obrigatório escolher exatamente 1 arte em cada frase, totalizando 3 votos.';
alter table public.site_settings add column if not exists handbanner_vote_phase3_important_cards text;
alter table public.site_settings add column if not exists handbanner_vote_phase3_confirm_text text;
alter table public.site_settings add column if not exists handbanner_vote_phase3_phrase_1 text default 'Frase 1';
alter table public.site_settings add column if not exists handbanner_vote_phase3_phrase_2 text default 'Frase 2';
alter table public.site_settings add column if not exists handbanner_vote_phase3_phrase_3 text default 'Frase 3';
alter table public.site_settings add column if not exists handbanner_vote_phase3_restriction_mode text default 'fingerprint';
alter table public.site_settings add column if not exists handbanner_vote_phase3_restriction_label text default '1 voto por navegador/dispositivo';
alter table public.site_settings add column if not exists handbanner_vote_phase3_limit_per_phrase integer default 1;
alter table public.site_settings add column if not exists handbanner_vote_phase3_published boolean default false;

insert into public.projects (project_key,title,description,details,status,voting_open,position)
select 'handbanner-votacao-fase-2','Hand Banner — Fase 2','Escolha exatamente 3 artes em cada frase.','9 votos no total, sem repetição.','rascunho',false,2
where not exists (select 1 from public.projects where project_key='handbanner-votacao-fase-2');
insert into public.projects (project_key,title,description,details,status,voting_open,position)
select 'handbanner-votacao-fase-3','Hand Banner — Fase 3','Escolha 1 arte em cada frase.','3 votos no total.','rascunho',false,3
where not exists (select 1 from public.projects where project_key='handbanner-votacao-fase-3');

insert into public.votacoes (project_key,titulo,descricao,fase,status,mostrar_ranking)
select 'handbanner-votacao-fase-2','Hand Banner — Fase 2','Escolha exatamente 3 artes em cada frase.','handbanner-fase-2','rascunho',false
where not exists (select 1 from public.votacoes where project_key='handbanner-votacao-fase-2');
insert into public.votacoes (project_key,titulo,descricao,fase,status,mostrar_ranking)
select 'handbanner-votacao-fase-3','Hand Banner — Fase 3','Escolha 1 arte em cada frase.','handbanner-fase-3','rascunho',false
where not exists (select 1 from public.votacoes where project_key='handbanner-votacao-fase-3');

create or replace function public.registrar_votos_handbanner_confirmados(votacao text, opcoes text[], voter_fingerprint text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  votacao_uuid uuid := votacao::uuid;
  opcao_uuid uuid;
  fp text := nullif(trim(coalesce(voter_fingerprint,'')),'');
  votacao_status text;
  chave text;
  restriction_mode text := 'fingerprint';
  limite_por_frase integer := 1;
  minimo_por_frase integer := 1;
  total_opcoes integer := coalesce(array_length(opcoes,1),0);
  qtd_distintas integer;
  frase_atual integer;
  qtd_frase integer;
  request_headers jsonb := coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  client_ip text := nullif(split_part(coalesce(request_headers->>'x-forwarded-for',request_headers->>'cf-connecting-ip',request_headers->>'x-real-ip',''),',',1),'');
  client_ua text := nullif(coalesce(request_headers->>'user-agent',''),'');
begin
  if fp is null then raise exception 'Dispositivo não identificado. Atualize a página e tente novamente.'; end if;

  select status,project_key into votacao_status,chave from public.votacoes where id=votacao_uuid;
  if votacao_status is null then raise exception 'Votação não encontrada.'; end if;
  if votacao_status <> 'aberta' then raise exception 'Esta votação está fechada.'; end if;

  if chave='handbanner-votacao-fase-2' then
    limite_por_frase:=3; minimo_por_frase:=3;
    select coalesce(handbanner_vote_phase2_restriction_mode,'fingerprint') into restriction_mode from public.site_settings where id=1;
  elsif chave='handbanner-votacao-fase-3' then
    limite_por_frase:=1; minimo_por_frase:=1;
    select coalesce(handbanner_vote_phase3_restriction_mode,'fingerprint') into restriction_mode from public.site_settings where id=1;
  else
    select coalesce(handbanner_vote_restriction_mode,'fingerprint'), greatest(1,least(20,coalesce(handbanner_vote_limit_per_phrase,1)))
      into restriction_mode,limite_por_frase from public.site_settings where id=1;
    minimo_por_frase:=1;
  end if;

  if total_opcoes < minimo_por_frase*3 or total_opcoes > limite_por_frase*3 then
    raise exception 'A quantidade de escolhas não corresponde à regra desta fase.';
  end if;
  select count(distinct x::uuid) into qtd_distintas from unnest(opcoes) x;
  if qtd_distintas <> total_opcoes then raise exception 'Não é permitido enviar a mesma arte repetida.'; end if;

  if restriction_mode='ip' then
    if client_ip is not null and exists(select 1 from public.votos_opcao where votacao_id=votacao_uuid and voter_ip=client_ip) then raise exception 'Já existe voto confirmado nesta rede/IP.'; end if;
    if client_ip is null and exists(select 1 from public.votos_opcao where votacao_id=votacao_uuid and voter_fingerprint=fp) then raise exception 'Você já confirmou seus votos nesta votação.'; end if;
  elsif restriction_mode='strict' then
    if exists(select 1 from public.votos_opcao where votacao_id=votacao_uuid and (voter_fingerprint=fp or (client_ip is not null and voter_ip=client_ip))) then raise exception 'Você já confirmou seus votos nesta votação.'; end if;
  else
    if exists(select 1 from public.votos_opcao where votacao_id=votacao_uuid and voter_fingerprint=fp) then raise exception 'Você já confirmou seus votos nesta votação.'; end if;
  end if;

  for frase_atual in 1..3 loop
    select count(*) into qtd_frase from public.opcoes_votacao ov
      where ov.votacao_id=votacao_uuid and ov.hb_frase=frase_atual and ov.id in(select x::uuid from unnest(opcoes) x);
    if qtd_frase < minimo_por_frase or qtd_frase > limite_por_frase then
      raise exception 'A Frase % exige exatamente % escolha(s).',frase_atual,limite_por_frase;
    end if;
  end loop;

  foreach opcao_uuid in array(select array_agg(x::uuid) from unnest(opcoes) x) loop
    if not exists(select 1 from public.opcoes_votacao where id=opcao_uuid and votacao_id=votacao_uuid and hb_frase in(1,2,3)) then raise exception 'Uma das artes selecionadas não pertence a esta votação.'; end if;
    insert into public.votos_opcao(votacao_id,opcao_id,voter_fingerprint,voter_ip,user_agent) values(votacao_uuid,opcao_uuid,fp,client_ip,client_ua);
    update public.opcoes_votacao o set votos_count=(select count(*) from public.votos_opcao v where v.opcao_id=opcao_uuid), votos=(select count(*) from public.votos_opcao v where v.opcao_id=opcao_uuid) where o.id=opcao_uuid;
  end loop;
  return true;
end; $$;
grant execute on function public.registrar_votos_handbanner_confirmados(text,text[],text) to anon,authenticated;
