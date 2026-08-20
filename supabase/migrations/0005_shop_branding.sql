-- =====================================================================
-- Nwslo — identite visuelle de la boutique
--
-- Le logo et la photo de couverture suivent la meme convention que les
-- photos de produits : <shop_id>/<fichier>. Le premier dossier decide
-- qui a le droit d'ecrire, via owns_storage_folder() (migration 0002).
-- =====================================================================

alter table public.shops
  add column if not exists cover_url text;

comment on column public.shops.cover_url is
  'Photo de couverture affichee en haut de la page de commande.';

-- ---------------------------------------------------------------------
-- Bucket separe des photos de produits : ce ne sont ni les memes
-- dimensions ni le meme cycle de vie, et un logo ne doit pas se
-- retrouver melange aux articles du menu.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-images',
  'shop-images',
  true,
  2097152, -- 2 Mo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists shop_images_public_read on storage.objects;
create policy shop_images_public_read on storage.objects
  for select using (bucket_id = 'shop-images');

drop policy if exists shop_images_owner_insert on storage.objects;
create policy shop_images_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-images'
    and public.owns_storage_folder(name)
  );

drop policy if exists shop_images_owner_update on storage.objects;
create policy shop_images_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shop-images'
    and public.owns_storage_folder(name)
  )
  with check (
    bucket_id = 'shop-images'
    and public.owns_storage_folder(name)
  );

drop policy if exists shop_images_owner_delete on storage.objects;
create policy shop_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-images'
    and public.owns_storage_folder(name)
  );
