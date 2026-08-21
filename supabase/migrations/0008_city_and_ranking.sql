-- =====================================================================
-- Nwslo — ville et classement de l'annuaire
--
-- L'accueil classe les snacks par nombre de commandes du mois. Ce
-- nombre n'est pas public : RLS reserve `orders` a son gerant. La
-- fonction ci-dessous fait le tri cote base et ne renvoie que les
-- boutiques — le compte sert a ordonner et ne sort jamais.
-- =====================================================================

alter table public.shops
  add column if not exists city text;

comment on column public.shops.city is
  'Ville, saisie librement par le gerant. Sert au filtre de l''annuaire.';

create index if not exists shops_city_idx
  on public.shops (city) where city is not null;

-- Le classement lit les commandes du mois pour chaque boutique.
create index if not exists orders_shop_month_idx
  on public.orders (shop_id, created_at desc);

-- ---------------------------------------------------------------------
-- L'annuaire public
--
-- SECURITY DEFINER : la fonction voit les commandes, l'appelant non.
-- Elle ne renvoie aucune colonne de commande, seulement l'ordre qui en
-- decoule — un concurrent ne peut donc pas lire les volumes des autres.
-- ---------------------------------------------------------------------
create or replace function public.snacks_publics()
returns table (
  id           uuid,
  name         text,
  slug         text,
  description  text,
  logo_url     text,
  cover_url    text,
  address      text,
  city         text,
  delivery_fee numeric,
  is_open      boolean,
  est_nouveau  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.slug, s.description, s.logo_url, s.cover_url,
         s.address, s.city, s.delivery_fee, s.is_open,
         s.created_at >= date_trunc('month', now()) as est_nouveau
    from public.shops s
    left join lateral (
      select count(*) as total
        from public.orders o
       where o.shop_id = s.id
         and o.created_at >= date_trunc('month', now())
    ) c on true
   where s.is_active
   -- Ouvert d'abord : un snack ferme ne sert a rien a qui a faim.
   -- Puis le plus commande ce mois-ci, puis le plus recent.
   order by s.is_open desc, c.total desc, s.created_at desc;
$$;

revoke all on function public.snacks_publics() from public;
grant execute on function public.snacks_publics() to anon, authenticated;
