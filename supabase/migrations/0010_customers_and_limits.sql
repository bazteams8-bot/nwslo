-- =====================================================================
-- Nwslo — clients connus, plafonds et blocage
--
-- Une commande fantaisiste passera toujours. L'objectif n'est pas de
-- l'empecher mais de la rendre penible a repeter : plafonner ce qu'un
-- meme numero ou un meme appareil peut lancer, garder l'historique, et
-- pouvoir bloquer.
-- =====================================================================

-- « Non recuperee » : le client n'est jamais venu chercher. C'est ce
-- compteur qui distingue un mauvais payeur d'un client ordinaire.
alter type public.order_status add value if not exists 'no_show';

-- ---------------------------------------------------------------------
-- Les clients d'un snack, identifies par leur numero
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  phone         text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  name          text,
  -- Les appareils vus avec ce numero. Bloquer un client bloque aussi
  -- ses appareils : changer de numero seul ne suffit pas.
  device_ids    text[] not null default '{}',
  orders_count  integer not null default 0,
  no_show_count integer not null default 0,
  is_blocked    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint customers_unique_phone unique (shop_id, phone)
);

create index if not exists customers_devices_idx
  on public.customers using gin (device_ids);

alter table public.customers enable row level security;

-- Seul le gerant voit ses clients. Aucune lecture publique : taper un
-- numero ne doit jamais permettre de recuperer le nom et l'adresse de
-- quelqu'un d'autre.
drop policy if exists customers_owner_read on public.customers;
create policy customers_owner_read on public.customers
  for select to authenticated using (public.is_shop_owner(shop_id));

drop policy if exists customers_owner_update on public.customers;
create policy customers_owner_update on public.customers
  for update to authenticated
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

-- ---------------------------------------------------------------------
-- Rattachement des commandes
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists customer_id uuid references public.customers(id)
    on delete set null,
  add column if not exists device_id text;

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_device_idx
  on public.orders (device_id, created_at desc) where device_id is not null;

-- ---------------------------------------------------------------------
-- Plafonds
-- ---------------------------------------------------------------------
-- Deux commandes ouvertes en meme temps suffisent a un vrai client :
-- au-dela, c'est soit une erreur, soit quelqu'un qui s'amuse.
create or replace function public.commandes_ouvertes(p_shop_id uuid, p_phone text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.orders
   where shop_id = p_shop_id
     and customer_phone = p_phone
     and status in ('new', 'preparing', 'ready');
$$;

create or replace function public.commandes_recentes_appareil(
  p_shop_id uuid,
  p_device  text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.orders
   where shop_id = p_shop_id
     and device_id = p_device
     and created_at >= now() - interval '1 hour';
$$;
