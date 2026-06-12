-- Rode este patch no Supabase se você já rodou o SQL anterior.
-- Ele corrige a votação para limitar por navegador/IP e até 3 opções por votação.

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

create unique index if not exists votos_opcao_unico_fingerprint_opcao
on public.votos_opcao (votacao_id, opcao_id, voter_fingerprint)
where voter_fingerprint is not null and voter_fingerprint <> '';

create unique index if not exists votos_opcao_unico_ip_opcao
on public.votos_opcao (votacao_id, opcao_id, voter_ip)
where voter_ip is not null and voter_ip <> '';

create or replace function public.registrar_voto_opcao(
  opcao text,
  votacao text,
  voter_fingerprint text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  opcao_uuid uuid := opcao::uuid;
  votacao_uuid uuid := votacao::uuid;
  votacao_status text;
  headers_raw text;
  headers_json jsonb := '{}'::jsonb;
  voter_ip_value text := null;
  user_agent_value text := null;
  votos_atuais integer := 0;
  novo_total integer := 0;
begin
  select status into votacao_status from public.votacoes where id = votacao_uuid;
  if votacao_status is null then
    raise exception 'Votação não encontrada.';
  end if;
  if votacao_status <> 'aberta' then
    raise exception 'Esta votação está fechada.';
  end if;

  begin
    headers_raw := current_setting('request.headers', true);
    if headers_raw is not null and headers_raw <> '' then
      headers_json := headers_raw::jsonb;
    end if;
  exception when others then
    headers_json := '{}'::jsonb;
  end;

  voter_ip_value := nullif(trim(split_part(coalesce(headers_json->>'x-forwarded-for', headers_json->>'cf-connecting-ip', headers_json->>'x-real-ip', ''), ',', 1)), '');
  user_agent_value := nullif(headers_json->>'user-agent', '');
  voter_fingerprint := nullif(trim(coalesce(voter_fingerprint, '')), '');

  if not exists (select 1 from public.opcoes_votacao where id = opcao_uuid and votacao_id = votacao_uuid) then
    raise exception 'Opção inválida para esta votação.';
  end if;

  if exists (
    select 1 from public.votos_opcao
    where votacao_id = votacao_uuid
      and opcao_id = opcao_uuid
      and (
        (voter_fingerprint is not null and votos_opcao.voter_fingerprint = voter_fingerprint)
        or (voter_ip_value is not null and votos_opcao.voter_ip = voter_ip_value)
      )
  ) then
    raise exception 'Você já votou nessa opção.';
  end if;

  select count(distinct opcao_id) into votos_atuais
  from public.votos_opcao
  where votacao_id = votacao_uuid
    and (
      (voter_fingerprint is not null and votos_opcao.voter_fingerprint = voter_fingerprint)
      or (voter_ip_value is not null and votos_opcao.voter_ip = voter_ip_value)
    );

  if votos_atuais >= 3 then
    raise exception 'Limite de 3 opções por votação atingido.';
  end if;

  insert into public.votos_opcao (votacao_id, opcao_id, voter_fingerprint, voter_ip, user_agent)
  values (votacao_uuid, opcao_uuid, voter_fingerprint, voter_ip_value, user_agent_value);

  update public.opcoes_votacao o
  set votos_count = (
    select count(*) from public.votos_opcao v where v.opcao_id = opcao_uuid
  )
  where o.id = opcao_uuid
  returning votos_count into novo_total;

  return coalesce(novo_total, 0);
exception
  when unique_violation then
    raise exception 'Você já votou nessa opção.';
end;
$$;

grant execute on function public.registrar_voto_opcao(text, text, text) to anon, authenticated;
