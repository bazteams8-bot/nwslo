-- =====================================================================
-- Nwslo — un abonnement echu ferme la boutique
--
-- Jusqu'ici `subscription_until` n'etait qu'une note dans /admin :
-- rien ne s'appuyait dessus. Une boutique dont l'abonnement avait
-- expire depuis un mois continuait a prendre des commandes, et il
-- fallait penser a la suspendre a la main — un oubli, et le service
-- est rendu gratuitement.
--
-- La regle vit dans la base, comme les horaires (migration 0009) :
-- l'annuaire, la page boutique et l'insertion de commande ne peuvent
-- pas diverger.
--
-- Une boutique echue devient invisible, exactement comme une boutique
-- suspendue a la main : sa page repond « introuvable ». Laisser la
-- page ouverte mais fermee laissait une surface ou des commandes
-- pouvaient encore etre tentees ; il n'en reste aucune.
--
-- Le gerant, lui, continue de voir sa boutique dans son tableau de
-- bord — sinon il ne pourrait ni comprendre ce qui se passe, ni
-- preparer sa reouverture.
-- =====================================================================

comment on column public.shops.subscription_until is
  'Fin de l''abonnement. NULL = pas de suivi, la boutique reste ouverte.
   Passe ce terme (plus le delai de grace), la boutique est fermee
   automatiquement — voir abonnement_valide().';

-- ---------------------------------------------------------------------
-- L'abonnement couvre-t-il aujourd'hui ?
--
-- Trois jours de tolerance : ici les reglements se font souvent de la
-- main a la main, et couper un client en pleine soiree parce qu'il
-- paie avec un jour de retard coute plus cher que ces trois jours.
-- ---------------------------------------------------------------------
create or replace function public.abonnement_valide(p_fin date)
returns boolean
language sql
stable
as $$
  select p_fin is null or p_fin + 3 >= current_date;
$$;

revoke all on function public.abonnement_valide(date) from public;
grant execute on function public.abonnement_valide(date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- La boutique echue disparait pour tout le monde sauf son gerant.
--
-- C'est cette regle qui fait reellement le travail : sans la ligne
-- `shops`, la page publique ne trouve rien et repond « introuvable »,
-- et les tables liees (produits, categories) ne se lisent plus non
-- plus. Tout ce qui suit n'est que de la defense en profondeur.
-- ---------------------------------------------------------------------
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read on public.shops
  for select using (
    (is_active and public.abonnement_valide(subscription_until))
    or public.is_shop_owner(id)
  );

-- ---------------------------------------------------------------------
-- « Ouvert » au sens du client : l'interrupteur, l'heure, et
-- l'abonnement. Le gerant garde la main pour fermer, jamais pour
-- ouvrir hors de ces regles.
-- ---------------------------------------------------------------------
create or replace function public.shop_ouvert(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select s.is_open
     and public.dans_les_horaires(s.opening_hours)
     and public.abonnement_valide(s.subscription_until)
    from public.shops s
   where s.id = p_shop_id;
$$;

revoke all on function public.shop_ouvert(uuid) from public;
grant execute on function public.shop_ouvert(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Refuser la commande plutot que l'accepter sans pouvoir la servir.
--
-- Un declencheur, comme pour les horaires : toute voie d'insertion
-- passe par la, pas seulement create_order().
--
-- Le nom compte : Postgres declenche dans l'ordre alphabetique, et
-- `orders_abonnement` passe avant `orders_horaires` — un abonnement
-- echu prime sur l'horaire.
-- ---------------------------------------------------------------------
create or replace function public.refuser_abonnement_expire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fin date;
begin
  select subscription_until into fin from public.shops where id = new.shop_id;

  if not public.abonnement_valide(fin) then
    raise exception 'ABONNEMENT_EXPIRE';
  end if;

  return new;
end $$;

drop trigger if exists orders_abonnement on public.orders;
create trigger orders_abonnement
  before insert on public.orders
  for each row execute function public.refuser_abonnement_expire();

-- ---------------------------------------------------------------------
-- L'annuaire ne met plus en avant une boutique qui ne paie plus.
--
-- Elle disparait d'ici, mais sa page reste accessible par son lien —
-- fermee. Une enseigne dont toutes les succursales sont echues sort
-- de l'annuaire avec elles.
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
       where s.is_active
         and s.business_id is null
         and public.abonnement_valide(s.subscription_until)

      union all

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
        join public.shops s
          on s.business_id = b.id
         and s.is_active
         and public.abonnement_valide(s.subscription_until)
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

-- Le choix de succursale ne propose plus une adresse qui ne peut pas
-- servir.
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
    join public.shops s
      on s.business_id = b.id
     and s.is_active
     and public.abonnement_valide(s.subscription_until)
   where b.slug = p_slug
   order by s.branch_label nulls last, s.name;
$$;

revoke all on function public.enseigne_publique(text) from public;
grant execute on function public.enseigne_publique(text) to anon, authenticated;
