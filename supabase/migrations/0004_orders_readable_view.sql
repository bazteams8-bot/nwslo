-- =====================================================================
-- Nwslo — vue de lecture des commandes
--
-- Une commande occupe trois tables : orders, order_items et
-- order_item_options. Pour la lire dans Supabase il fallait ouvrir les
-- trois. Cette vue en fait une ligne, triee du plus recent au plus
-- ancien.
--
-- Lecture seule : l'application continue de passer par les tables.
-- =====================================================================

create or replace view public.commandes_lisibles
with (security_invoker = on) as
select
  o.order_number as numero,

  to_char(
    o.created_at at time zone 'Africa/Casablanca',
    'DD/MM HH24:MI'
  ) as quand,

  o.status as statut,
  o.customer_name as client,
  o.customer_phone as telephone,

  case
    when o.delivery_type = 'delivery' then coalesce(o.customer_address, '')
    else 'a emporter'
  end as adresse,

  -- « 2x tacos poulet (Grand, Fromage) », une ligne par article.
  (
    select string_agg(
      oi.quantity || 'x ' || oi.product_name ||
      coalesce(
        ' (' || (
          select string_agg(oio.option_name, ', ' order by oio.group_name)
            from order_item_options oio
           where oio.order_item_id = oi.id
        ) || ')',
        ''
      ),
      chr(10) order by oi.product_name
    )
      from order_items oi
     where oi.order_id = o.id
  ) as articles,

  o.subtotal,
  o.delivery_fee as livraison,
  o.total,
  o.note,

  o.shop_id,
  o.created_at
from public.orders o
order by o.created_at desc;

-- `security_invoker = on` : la vue s'execute avec les droits de celui
-- qui l'interroge, donc RLS s'applique toujours. Sans cette option,
-- une vue contourne RLS et exposerait les commandes de tous les snacks.

comment on view public.commandes_lisibles is
  'Lecture seule : une commande par ligne, articles et options resumes.';
