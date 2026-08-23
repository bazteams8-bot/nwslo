-- =====================================================================
-- Nwslo — enseignes a plusieurs succursales
--
-- Jusqu'ici chaque boutique etait independante : deux points de vente
-- d'un meme snack apparaissaient comme deux fiches sans lien dans
-- l'annuaire. Une enseigne (« businesses ») regroupe ses succursales
-- (« shops ») sous une seule fiche publique ; le client choisit sa
-- succursale avant d'atteindre le menu, donc avant toute commande —
-- il n'y a pas de panier ni de commande qui existe hors d'une
-- succursale precise.
-- =====================================================================

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  logo_url    text,
  cover_url   text,
  created_at  timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- Seul l'exploitant (cle de service) cree ou modifie une enseigne : le
-- regroupement reste, comme la creation de boutique, decide a la main
-- plutot que laisse en libre-service.
create policy "Le gerant lit l'enseigne de sa boutique"
on public.businesses for select
to authenticated
using (
  exists (
    select 1 from public.shops s
     where s.business_id = businesses.id
       and public.is_shop_owner(s.id)
  )
);

alter table public.shops
  add column if not exists business_id  uuid references public.businesses(id) on delete set null,
  add column if not exists branch_label text;

comment on column public.shops.business_id is
  'Enseigne dont cette boutique est une succursale. NULL = boutique independante.';
comment on column public.shops.branch_label is
  'Nom court de cette succursale au sein de l''enseigne, ex. "Maarif".';

create index if not exists shops_business_idx
  on public.shops (business_id) where business_id is not null;

-- ---------------------------------------------------------------------
-- La fiche publique d'une enseigne : son identite, et la liste de ses
-- succursales actives. C'est cette page qui fait choisir la
-- succursale — le menu et la commande restent, eux, entierement
-- inchanges une fois sur la boutique choisie.
-- ---------------------------------------------------------------------
create or replace function public.enseigne_publique(p_slug text)
returns table (
  business_id   uuid,
  business_name text,
  description   text,
  logo_url      text,
  cover_url     text,
  branch_id     uuid,
  branch_label  text,
  branch_slug   text,
  address       text,
  city          text,
  delivery_fee  numeric,
  is_open       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.description, b.logo_url, b.cover_url,
         s.id, s.branch_label, s.slug, s.address, s.city, s.delivery_fee,
         (s.is_open and public.dans_les_horaires(s.opening_hours))
    from public.businesses b
    join public.shops s on s.business_id = b.id and s.is_active
   where b.slug = p_slug
   order by s.branch_label nulls last, s.name;
$$;

revoke all on function public.enseigne_publique(text) from public;
grant execute on function public.enseigne_publique(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- L'annuaire : une ligne par boutique independante, une seule ligne
-- par enseigne (peu importe son nombre de succursales). Le compte de
-- commandes qui decide du tri n'est toujours pas expose — voir
-- migration 0008.
-- ---------------------------------------------------------------------
create or replace function public.snacks_publics()
returns table (
  id           uuid,
  kind         text,
  name         text,
  slug         text,
  description  text,
  logo_url     text,
  cover_url    text,
  address      text,
  city         text,
  delivery_fee numeric,
  is_open      boolean,
  est_nouveau  boolean,
  succursales  integer
)
language sql
stable
security definer
set search_path = public
as $$
  select id, kind, name, slug, description, logo_url, cover_url, address,
         city, delivery_fee, is_open, est_nouveau, succursales
    from (
      -- Boutiques sans enseigne : comme avant, une ligne chacune.
      select s.id, 'shop'::text as kind, s.name, s.slug, s.description,
             s.logo_url, s.cover_url, s.address, s.city, s.delivery_fee,
             (s.is_open and public.dans_les_horaires(s.opening_hours)) as is_open,
             (s.created_at >= date_trunc('month', now())) as est_nouveau,
             1 as succursales,
             coalesce(c.total, 0) as tri_commandes,
             s.created_at as tri_date
        from public.shops s
        left join lateral (
          select count(*) as total
            from public.orders o
           where o.shop_id = s.id
             and o.created_at >= date_trunc('month', now())
        ) c on true
       where s.is_active and s.business_id is null

      union all

      -- Enseignes : une ligne par enseigne, agregee sur ses succursales
      -- actives.
      select b.id, 'business'::text as kind, b.name, b.slug, b.description,
             b.logo_url, b.cover_url,
             null::text as address,
             string_agg(distinct s.city, ', ' order by s.city) as city,
             min(s.delivery_fee) as delivery_fee,
             bool_or(s.is_open and public.dans_les_horaires(s.opening_hours)) as is_open,
             (b.created_at >= date_trunc('month', now())) as est_nouveau,
             count(*)::int as succursales,
             coalesce(sum(c.total), 0)::bigint as tri_commandes,
             min(s.created_at) as tri_date
        from public.businesses b
        join public.shops s on s.business_id = b.id and s.is_active
        left join lateral (
          select count(*) as total
            from public.orders o
           where o.shop_id = s.id
             and o.created_at >= date_trunc('month', now())
        ) c on true
       group by b.id, b.name, b.slug, b.description, b.logo_url, b.cover_url, b.created_at
    ) tout
   order by is_open desc, tri_commandes desc, tri_date desc;
$$;

revoke all on function public.snacks_publics() from public;
grant execute on function public.snacks_publics() to anon, authenticated;
