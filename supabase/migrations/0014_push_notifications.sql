-- =====================================================================
-- Nwslo — alerter le gerant sans qu'il garde une page ouverte
--
-- Jusqu'ici la commande n'arrivait que par Realtime, dans un onglet
-- ouvert, et l'alerte etait dessinee par cette page. Onglet ferme,
-- navigateur ferme, telephone verrouille : la commande arrivait sans
-- que personne ne le sache.
--
-- Le push, lui, part d'ici vers Google/Apple, qui reveillent le
-- service worker installe sur l'appareil. Plus rien ne depend d'une
-- page ouverte.
-- =====================================================================

-- pg_net envoie la requete HTTP en differe, dans un worker : la
-- commande n'attend pas la reponse de Vercel pour etre enregistree.
-- Un push lent ne doit jamais ralentir une prise de commande.
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- Les appareils a prevenir
--
-- Un gerant peut en avoir plusieurs (le telephone du comptoir, le
-- sien) : on les previent tous. `endpoint` est l'adresse que le
-- navigateur nous donne, unique par appareil et par navigateur.
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_shop_idx
  on public.push_subscriptions (shop_id);

alter table public.push_subscriptions enable row level security;

-- Le gerant gere les appareils de sa boutique, et rien d'autre.
-- L'envoi, lui, passe par la cle de service et ignore ces regles.
drop policy if exists push_subscriptions_owner on public.push_subscriptions;
create policy push_subscriptions_owner on public.push_subscriptions
  for all
  to authenticated
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

-- ---------------------------------------------------------------------
-- Ou envoyer, et avec quel secret
--
-- Ranges dans la configuration de la base plutot qu'ecrits dans cette
-- fonction : le secret n'a pas a vivre dans un fichier de migration
-- suivi par Git.
--
--   alter database postgres set app.push_url    = 'https://nwslo.com/api/push';
--   alter database postgres set app.push_secret = '...';
-- ---------------------------------------------------------------------
create or replace function public.prevenir_nouvelle_commande()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  url    text := current_setting('app.push_url', true);
  secret text := current_setting('app.push_secret', true);
begin
  -- Tant que la configuration n'est pas posee, on ne fait rien : une
  -- alerte manquante ne doit jamais empecher une commande d'exister.
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

-- AFTER INSERT : on ne previent que d'une commande reellement
-- enregistree. Un declencheur BEFORE alerterait aussi pour celles que
-- les horaires ou l'abonnement vont refuser.
drop trigger if exists orders_push on public.orders;
create trigger orders_push
  after insert on public.orders
  for each row execute function public.prevenir_nouvelle_commande();

-- ---------------------------------------------------------------------
-- Ce que le serveur a besoin de lire pour composer l'alerte
--
-- Il tourne avec la cle de service et pourrait tout lire ; cette
-- fonction le limite a ce qui s'affiche sur l'ecran verrouille, et
-- garde la composition du message au meme endroit que le reste.
-- ---------------------------------------------------------------------
create or replace function public.commande_pour_alerte(p_order_id uuid)
returns table (
  shop_id      uuid,
  order_number text,
  total        numeric,
  customer     text,
  articles     integer
)
language sql
stable
security definer
set search_path = public
as $$
  select o.shop_id,
         o.order_number,
         o.total,
         o.customer_name,
         coalesce(sum(i.quantity), 0)::int
    from public.orders o
    left join public.order_items i on i.order_id = o.id
   where o.id = p_order_id
   group by o.shop_id, o.order_number, o.total, o.customer_name;
$$;

revoke all on function public.commande_pour_alerte(uuid) from public;
