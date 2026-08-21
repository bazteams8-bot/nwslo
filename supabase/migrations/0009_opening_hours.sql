-- =====================================================================
-- Nwslo — horaires d'ouverture
--
-- Le gerant devait ouvrir et fermer sa boutique a la main chaque jour.
-- Oublier d'ouvrir le matin coute des commandes sans que rien ne le
-- signale.
--
-- `opening_hours` : tableau JSON de 7 creneaux, indexes comme
-- extract(dow) — 0 = dimanche ... 6 = samedi.
--   [{"o":"09:00","c":"23:00"}, null, ...]
-- Un creneau nul ferme ce jour-la. La colonne nulle = pas d'horaires,
-- et seul l'interrupteur manuel compte.
-- =====================================================================

alter table public.shops
  add column if not exists opening_hours jsonb;

comment on column public.shops.opening_hours is
  'Sept creneaux indexes sur extract(dow). NULL = pas d''horaires.';

-- ---------------------------------------------------------------------
-- Sommes-nous dans les horaires ?
--
-- Gere les creneaux a cheval sur minuit — un snack qui ferme a 2 h du
-- matin est le cas courant, pas l'exception.
-- ---------------------------------------------------------------------
create or replace function public.dans_les_horaires(
  p_horaires jsonb,
  p_moment   timestamptz default now()
)
returns boolean
language plpgsql
stable
as $$
declare
  local     timestamp;
  index_jour integer;
  creneau   jsonb;
  ouverture time;
  fermeture time;
  heure     time;
begin
  if p_horaires is null then
    return true; -- pas d'horaires : l'interrupteur manuel decide seul
  end if;

  local := p_moment at time zone 'Africa/Casablanca';
  heure := local::time;
  index_jour := extract(dow from local)::integer;

  -- Le creneau du jour.
  creneau := p_horaires -> index_jour;
  if creneau is not null and jsonb_typeof(creneau) = 'object' then
    ouverture := (creneau ->> 'o')::time;
    fermeture := (creneau ->> 'c')::time;

    if fermeture > ouverture then
      if heure >= ouverture and heure < fermeture then
        return true;
      end if;
    else
      -- Fermeture apres minuit : ouvert de l'ouverture jusqu'a minuit.
      if heure >= ouverture then
        return true;
      end if;
    end if;
  end if;

  -- La veille a pu deborder sur ce matin.
  creneau := p_horaires -> ((index_jour + 6) % 7);
  if creneau is not null and jsonb_typeof(creneau) = 'object' then
    ouverture := (creneau ->> 'o')::time;
    fermeture := (creneau ->> 'c')::time;
    if fermeture <= ouverture and heure < fermeture then
      return true;
    end if;
  end if;

  return false;
end $$;

-- « Ouvert maintenant » = l'interrupteur du gerant ET les horaires.
-- L'interrupteur reste souverain : il ferme en pleine journee, il ne
-- peut pas ouvrir hors horaires.
create or replace function public.shop_ouvert(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select s.is_open and public.dans_les_horaires(s.opening_hours)
    from public.shops s
   where s.id = p_shop_id;
$$;

revoke all on function public.shop_ouvert(uuid) from public;
grant execute on function public.shop_ouvert(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Interdire une commande hors horaires
--
-- Un declencheur plutot qu'une modification de create_order() : la
-- regle vit a un seul endroit, et toute autre voie d'insertion la
-- respecte aussi.
-- ---------------------------------------------------------------------
create or replace function public.refuser_hors_horaires()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  horaires jsonb;
begin
  select opening_hours into horaires from public.shops where id = new.shop_id;

  if not public.dans_les_horaires(horaires) then
    raise exception 'SNACK_FERME';
  end if;

  return new;
end $$;

drop trigger if exists orders_horaires on public.orders;
create trigger orders_horaires
  before insert on public.orders
  for each row execute function public.refuser_hors_horaires();

-- ---------------------------------------------------------------------
-- L'annuaire tient compte des horaires
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
         s.address, s.city, s.delivery_fee,
         -- « ouvert » au sens du client : l'interrupteur et l'heure.
         s.is_open and public.dans_les_horaires(s.opening_hours) as is_open,
         s.created_at >= date_trunc('month', now()) as est_nouveau
    from public.shops s
    left join lateral (
      select count(*) as total
        from public.orders o
       where o.shop_id = s.id
         and o.created_at >= date_trunc('month', now())
    ) c on true
   where s.is_active
   order by (s.is_open and public.dans_les_horaires(s.opening_hours)) desc,
            c.total desc,
            s.created_at desc;
$$;

revoke all on function public.snacks_publics() from public;
grant execute on function public.snacks_publics() to anon, authenticated;
