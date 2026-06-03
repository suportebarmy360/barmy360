-- Atualização segura para esta versão do BARMY360
-- Não apaga dados. Apenas garante campos usados pelo painel/site.

alter table if exists public.help_items
add column if not exists extra_images text;

alter table if exists public.community_posts
add column if not exists image_url text;

-- Garante que o bucket de imagens exista para uploads pelo painel ADM
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
