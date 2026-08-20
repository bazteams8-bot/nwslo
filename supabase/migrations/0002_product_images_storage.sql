-- =====================================================================
-- Nwslo — stockage des photos de produits
--
-- Convention de chemin : <shop_id>/<fichier>
-- Le premier dossier porte l'identifiant de la boutique ; c'est lui qui
-- decide qui a le droit d'ecrire.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Le bucket
-- Public en lecture : les photos doivent s'afficher pour un client qui
-- n'est pas connecte. Rien de sensible n'y est stocke.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152, -- 2 Mo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- « Ce fichier est-il range dans le dossier d'une boutique que
--   l'utilisateur connecte possede ? »
--
-- Le nom du dossier vient du client : il peut contenir n'importe quoi.
-- Le cast vers uuid est donc protege, sinon un dossier nomme « toto »
-- ferait echouer la politique au lieu de refuser proprement.
-- ---------------------------------------------------------------------
create or replace function public.owns_storage_folder(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  dossier text;
  boutique uuid;
begin
  dossier := (storage.foldername(object_name))[1];
  if dossier is null then
    return false;
  end if;

  begin
    boutique := dossier::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  return public.is_shop_owner(boutique);
end $$;

-- ---------------------------------------------------------------------
-- Politiques
-- ---------------------------------------------------------------------
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_owner_insert on storage.objects;
create policy product_images_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.owns_storage_folder(name)
  );

drop policy if exists product_images_owner_update on storage.objects;
create policy product_images_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.owns_storage_folder(name)
  )
  with check (
    bucket_id = 'product-images'
    and public.owns_storage_folder(name)
  );

drop policy if exists product_images_owner_delete on storage.objects;
create policy product_images_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.owns_storage_folder(name)
  );
