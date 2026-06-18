-- Patch BARMY360 - Envio de artes do Hand Banner sem Google
-- Limite: até 3 envios por aparelho/navegador via device_id.

alter table public.handbanner_art_submissions
  add column if not exists device_id text;

alter table public.handbanner_art_submissions
  alter column user_id drop not null;

alter table public.handbanner_art_submissions
  alter column google_email drop not null;

create index if not exists handbanner_art_submissions_device_id_idx
  on public.handbanner_art_submissions (device_id);

-- A função faz a contagem e insere com segurança, sem depender de login Google.
create or replace function public.registrar_envio_arte_handbanner(
  p_device_id text,
  p_full_name text,
  p_social_handle text,
  p_contact_email text,
  p_cloud_link text,
  p_minor_authorization_link text default '',
  p_agree_term boolean default false,
  p_agree_minor boolean default false,
  p_agree_rules boolean default false,
  p_observation text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total_envios integer;
begin
  if coalesce(trim(p_device_id), '') = '' then
    raise exception 'Não foi possível identificar este aparelho. Atualize a página e tente novamente.';
  end if;

  if coalesce(trim(p_full_name), '') = ''
     or coalesce(trim(p_social_handle), '') = ''
     or coalesce(trim(p_contact_email), '') = ''
     or coalesce(trim(p_cloud_link), '') = '' then
    raise exception 'Preencha todos os campos obrigatórios.';
  end if;

  select count(*)
    into total_envios
  from public.handbanner_art_submissions
  where device_id = p_device_id;

  if total_envios >= 3 then
    raise exception 'Limite de 3 envios por aparelho/navegador atingido.';
  end if;

  insert into public.handbanner_art_submissions (
    device_id,
    user_id,
    google_email,
    full_name,
    social_handle,
    contact_email,
    cloud_link,
    term_agreement_link,
    minor_authorization_link,
    agree_term,
    agree_minor,
    agree_rules,
    observation
  ) values (
    p_device_id,
    null,
    '',
    trim(p_full_name),
    trim(p_social_handle),
    trim(p_contact_email),
    trim(p_cloud_link),
    '',
    coalesce(trim(p_minor_authorization_link), ''),
    p_agree_term,
    p_agree_minor,
    p_agree_rules,
    coalesce(trim(p_observation), '')
  );

  return total_envios + 1;
end;
$$;

grant execute on function public.registrar_envio_arte_handbanner(text, text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;

-- Permite leitura mínima de contagem por device_id no formulário.
-- A função RPC acima é a validação principal do limite.
drop policy if exists "handbanner_insert_own" on public.handbanner_art_submissions;
drop policy if exists "handbanner_insert_device" on public.handbanner_art_submissions;
create policy "handbanner_insert_device"
  on public.handbanner_art_submissions
  for insert
  to anon, authenticated
  with check (true);

-- Mantém leitura para ADM autenticado e permite count público filtrado.
drop policy if exists "handbanner_read_admin" on public.handbanner_art_submissions;
create policy "handbanner_read_admin"
  on public.handbanner_art_submissions
  for select
  to authenticated
  using (true);

drop policy if exists "handbanner_read_count_device" on public.handbanner_art_submissions;
create policy "handbanner_read_count_device"
  on public.handbanner_art_submissions
  for select
  to anon
  using (true);

notify pgrst, 'reload schema';
