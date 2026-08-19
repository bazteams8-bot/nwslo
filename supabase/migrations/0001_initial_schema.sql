-- =====================================================================
-- Nwslo — schema initial
-- Tables, index, contraintes et politiques RLS.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('new', 'preparing', 'ready', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_type as enum ('delivery', 'pickup');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- shops
-- ---------------------------------------------------------------------
create table if not exists public.shops (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null check (length(trim(name)) between 2 and 80),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text,
  logo_url       text,
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+?[0-9]{8,15}$'),
  address        text,
  delivery_fee   numeric(10,2) not null default 0 check (delivery_fee >= 0),
  min_order      numeric(10,2) not null default 0 check (min_order >= 0),
  is_open        boolean not null default true,   -- pause temporaire
  is_active      boolean not null default true,   -- boutique publiee
  order_counter  integer not null default 0,      -- numerotation par boutique
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists shops_owner_idx on public.shops (owner_id);

-- Vrai si l'utilisateur connecte possede la boutique.
-- Doit etre defini APRES `shops` : une fonction `language sql` est
-- validee des sa creation, la table doit donc deja exister.
-- SECURITY DEFINER : contourne le RLS de `shops` pour eviter une
-- recursion infinie entre les politiques.
create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shops s
    where s.id = p_shop_id and s.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 60),
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categories_shop_idx on public.categories (shop_id, position);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,
  name         text not null check (length(trim(name)) between 1 and 80),
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  image_url    text,
  is_available boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_shop_idx on public.products (shop_id, position);
create index if not exists products_category_idx on public.products (category_id);

-- ---------------------------------------------------------------------
-- option_groups  (ex. « Taille », « Supplements »)
-- ---------------------------------------------------------------------
create table if not exists public.option_groups (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 60),
  is_required boolean not null default false,
  min_select  integer not null default 0 check (min_select >= 0),
  max_select  integer not null default 1 check (max_select >= 1),
  position    integer not null default 0,
  constraint option_group_range check (max_select >= min_select)
);

create index if not exists option_groups_product_idx
  on public.option_groups (product_id, position);

-- ---------------------------------------------------------------------
-- option_items  (ex. « Grand +15 DH »)
-- ---------------------------------------------------------------------
create table if not exists public.option_items (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.option_groups(id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 60),
  price_delta  numeric(10,2) not null default 0,
  is_available boolean not null default true,
  position     integer not null default 0
);

create index if not exists option_items_group_idx
  on public.option_items (group_id, position);

-- ---------------------------------------------------------------------
-- orders
-- Les colonnes de prix sont des instantanes : elles ne changent jamais,
-- meme si le menu est modifie plus tard.
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops(id) on delete restrict,
  order_number     text not null,
  customer_name    text not null check (length(trim(customer_name)) between 2 and 80),
  customer_phone   text not null check (customer_phone ~ '^\+?[0-9]{8,15}$'),
  customer_address text,
  delivery_type    public.delivery_type not null default 'delivery',
  note             text,
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  delivery_fee     numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total            numeric(10,2) not null check (total >= 0),
  status           public.order_status not null default 'new',
  whatsapp_opened  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_number_unique unique (shop_id, order_number),
  constraint orders_address_required_for_delivery check (
    delivery_type <> 'delivery'
    or (customer_address is not null and length(trim(customer_address)) > 0)
  )
);

create index if not exists orders_shop_idx on public.orders (shop_id, created_at desc);
create index if not exists orders_status_idx on public.orders (shop_id, status);

-- Numero sequentiel par boutique : 0001, 0002, ...
create or replace function public.assign_order_number()
returns trigger language plpgsql as $$
declare
  next_val integer;
begin
  update public.shops
     set order_counter = order_counter + 1
   where id = new.shop_id
  returning order_counter into next_val;

  new.order_number := lpad(next_val::text, 4, '0');
  return new;
end $$;

-- ---------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,                      -- instantane
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  options_total numeric(10,2) not null default 0,
  quantity      integer not null check (quantity > 0),
  line_total    numeric(10,2) not null check (line_total >= 0),
  note          text
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------
-- order_item_options
-- ---------------------------------------------------------------------
create table if not exists public.order_item_options (
  id            uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  group_name    text not null,                      -- instantane
  option_name   text not null,                      -- instantane
  price_delta   numeric(10,2) not null default 0
);

create index if not exists order_item_options_item_idx
  on public.order_item_options (order_item_id);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
drop trigger if exists shops_touch on public.shops;
drop trigger if exists products_touch on public.products;
drop trigger if exists orders_touch on public.orders;
drop trigger if exists orders_number on public.orders;

create trigger shops_touch before update on public.shops
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger orders_number before insert on public.orders
  for each row execute function public.assign_order_number();

-- =====================================================================
-- RLS — Row Level Security
-- Regle de base : tout est interdit, on ouvre ensuite au cas par cas.
-- =====================================================================

alter table public.shops              enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.option_groups      enable row level security;
alter table public.option_items       enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.order_item_options enable row level security;

-- --- shops -----------------------------------------------------------
drop policy if exists shops_public_read on public.shops;
create policy shops_public_read on public.shops
  for select using (is_active or public.is_shop_owner(id));

drop policy if exists shops_owner_insert on public.shops;
create policy shops_owner_insert on public.shops
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists shops_owner_update on public.shops;
create policy shops_owner_update on public.shops
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists shops_owner_delete on public.shops;
create policy shops_owner_delete on public.shops
  for delete to authenticated using (owner_id = (select auth.uid()));

-- --- categories ------------------------------------------------------
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.is_active)
    or public.is_shop_owner(shop_id)
  );

drop policy if exists categories_owner_write on public.categories;
create policy categories_owner_write on public.categories
  for all to authenticated
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

-- --- products --------------------------------------------------------
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (
    exists (select 1 from public.shops s where s.id = shop_id and s.is_active)
    or public.is_shop_owner(shop_id)
  );

drop policy if exists products_owner_write on public.products;
create policy products_owner_write on public.products
  for all to authenticated
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

-- --- option_groups ---------------------------------------------------
drop policy if exists option_groups_public_read on public.option_groups;
create policy option_groups_public_read on public.option_groups
  for select using (
    exists (
      select 1 from public.products p join public.shops s on s.id = p.shop_id
      where p.id = product_id and (s.is_active or s.owner_id = (select auth.uid()))
    )
  );

drop policy if exists option_groups_owner_write on public.option_groups;
create policy option_groups_owner_write on public.option_groups
  for all to authenticated
  using (
    exists (select 1 from public.products p
            where p.id = product_id and public.is_shop_owner(p.shop_id))
  )
  with check (
    exists (select 1 from public.products p
            where p.id = product_id and public.is_shop_owner(p.shop_id))
  );

-- --- option_items ----------------------------------------------------
drop policy if exists option_items_public_read on public.option_items;
create policy option_items_public_read on public.option_items
  for select using (
    exists (
      select 1
        from public.option_groups g
        join public.products p on p.id = g.product_id
        join public.shops s on s.id = p.shop_id
       where g.id = group_id and (s.is_active or s.owner_id = (select auth.uid()))
    )
  );

drop policy if exists option_items_owner_write on public.option_items;
create policy option_items_owner_write on public.option_items
  for all to authenticated
  using (
    exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id
            where g.id = group_id and public.is_shop_owner(p.shop_id))
  )
  with check (
    exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id
            where g.id = group_id and public.is_shop_owner(p.shop_id))
  );

-- --- orders ----------------------------------------------------------
-- Aucune politique INSERT : le client ne peut pas creer de commande
-- directement. La creation passera par une fonction serveur qui
-- recalcule les prix depuis la base (etape suivante du projet).
drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
  for select to authenticated using (public.is_shop_owner(shop_id));

drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_update on public.orders
  for update to authenticated
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

-- --- order_items -----------------------------------------------------
drop policy if exists order_items_owner_read on public.order_items;
create policy order_items_owner_read on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = order_id and public.is_shop_owner(o.shop_id))
  );

-- --- order_item_options ----------------------------------------------
drop policy if exists order_item_options_owner_read on public.order_item_options;
create policy order_item_options_owner_read on public.order_item_options
  for select to authenticated using (
    exists (
      select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and public.is_shop_owner(o.shop_id)
    )
  );

-- =====================================================================
-- Realtime : le tableau de bord recoit les nouvelles commandes en direct
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
