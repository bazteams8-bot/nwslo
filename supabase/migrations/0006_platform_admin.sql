-- =====================================================================
-- Nwslo — administration de la plateforme
--
-- Distingue deux roles qui n'ont rien a voir :
--   - le gerant d'un snack, qui gere sa carte et ses commandes ;
--   - l'exploitant de Nwslo, qui cree les snacks et suit les abonnements.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Qui administre la plateforme
-- ---------------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- Un compte peut verifier s'il est administrateur, rien de plus.
-- La liste complete n'est jamais lisible, meme par un administrateur :
-- les pages d'admin passent par la cle de service.
drop policy if exists platform_admins_self_read on public.platform_admins;
create policy platform_admins_self_read on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Abonnement
-- ---------------------------------------------------------------------
alter table public.shops
  add column if not exists subscription_until date;

comment on column public.shops.subscription_until is
  'Fin de l''abonnement. NULL = pas de suivi. Ne suspend rien tout seul :
   la suspension reste une decision manuelle via is_active.';

-- Retrouver rapidement les abonnements qui arrivent a terme.
create index if not exists shops_subscription_idx
  on public.shops (subscription_until)
  where subscription_until is not null;
