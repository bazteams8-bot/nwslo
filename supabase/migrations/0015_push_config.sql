-- =====================================================================
-- Nwslo — ou ranger l'adresse et le secret du push
--
-- La migration 0014 lisait ces deux valeurs dans la configuration de
-- la base (`alter database ... set`). Sur Supabase, ce n'est pas
-- possible : poser un parametre demande des droits que le projet n'a
-- pas — « permission denied to set parameter ».
--
-- On les range donc dans une table, hors du schema `public` : ce
-- schema-la n'est pas expose par l'API, et aucun droit n'y est donne
-- a anon ni a authenticated. Seule une fonction SECURITY DEFINER,
-- qui s'execute avec les droits de son proprietaire, peut la lire.
-- =====================================================================

create schema if not exists private;

-- Personne n'entre ici par l'API. La revocation est explicite : par
-- defaut, `public` (au sens SQL : tout role) peut utiliser un schema
-- qu'on vient de creer.
revoke all on schema private from public;
revoke usage on schema private from anon, authenticated;

create table if not exists private.config (
  cle    text primary key,
  valeur text not null
);

alter table private.config enable row level security;
revoke all on table private.config from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Le declencheur relit sa configuration ici
--
-- Tant que les deux lignes ne sont pas posees, la fonction ne fait
-- rien : une alerte impossible a envoyer ne doit jamais empecher une
-- commande d'etre enregistree.
-- ---------------------------------------------------------------------
create or replace function public.prevenir_nouvelle_commande()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  url    text;
  secret text;
begin
  select valeur into url    from private.config where cle = 'push_url';
  select valeur into secret from private.config where cle = 'push_secret';

  if url is null or secret is null then
    return null;
  end if;

  perform net.http_post(
    url     := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nwslo-secret', secret
    ),
    body    := jsonb_build_object('order_id', new.id),
    timeout_milliseconds := 5000
  );

  return null;
end $$;
