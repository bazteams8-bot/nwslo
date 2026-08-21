-- =====================================================================
-- Nwslo — formules d'abonnement
--
-- On enregistre la date d'inscription et la formule choisie ; la fin
-- d'abonnement en decoule. Saisir directement une date de fin laissait
-- passer des erreurs de mois invisibles.
--
-- Les plafonds de commandes ne sont pas ici : ils vivent dans le code,
-- ou ils se lisent et se changent sans migration. La base ne compte
-- pas les commandes, elle ne fait que porter la formule.
-- =====================================================================

do $$ begin
  create type public.subscription_plan as enum
    ('essentiel', 'pro', 'illimite');
exception when duplicate_object then null; end $$;

alter table public.shops
  add column if not exists subscribed_at  date,
  add column if not exists plan           public.subscription_plan
                                          not null default 'essentiel',
  add column if not exists monthly_price  numeric(10,2) not null default 149
                                          check (monthly_price >= 0),
  add column if not exists is_trial       boolean not null default false;

comment on column public.shops.subscribed_at is
  'Jour ou le client a rejoint la plateforme. Informatif : c''est
   subscription_until qui fait foi pour l''acces.';

comment on column public.shops.is_trial is
  'Periode d''essai en cours. Le prix reste enregistre pour savoir ce
   que le client paiera a la conversion.';

-- Les boutiques creees avant cette migration gardent une trace
-- coherente plutot qu'une date d'inscription vide.
update public.shops
   set subscribed_at = created_at::date
 where subscribed_at is null;
