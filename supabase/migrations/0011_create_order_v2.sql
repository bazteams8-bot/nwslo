-- =====================================================================
-- Nwslo — create_order, avec identite du client et plafonds
--
-- L'ancienne signature est supprimee : la laisser creerait une
-- surcharge qu'un appel sans appareil emprunterait, contournant les
-- plafonds qu'on vient d'ajouter.
-- =====================================================================

drop function if exists public.create_order(
  uuid, text, text, text, public.delivery_type, text, jsonb
);

create or replace function public.create_order(
  p_shop_id          uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_delivery_type    public.delivery_type,
  p_note             text,
  p_items            jsonb,
  p_device_id        text default null
)
returns table (order_id uuid, order_number text, order_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop          shops%rowtype;
  v_client        customers%rowtype;
  v_item          jsonb;
  v_product       products%rowtype;
  v_group         option_groups%rowtype;
  v_quantity      integer;
  v_choices       uuid[];
  v_choice_count  integer;
  v_group_count   integer;
  v_options_total numeric(10,2);
  v_line_total    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
  v_delivery      numeric(10,2);
  v_order_id      uuid;
  v_order_item    uuid;
  v_number        text;
begin
  select * into v_shop from shops where id = p_shop_id and is_active;
  if not found then
    raise exception 'SNACK_INTROUVABLE';
  end if;
  if not v_shop.is_open then
    raise exception 'SNACK_FERME';
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'NOM_INVALIDE';
  end if;
  if coalesce(p_customer_phone, '') !~ '^\+?[0-9]{8,15}$' then
    raise exception 'TELEPHONE_INVALIDE';
  end if;
  if p_delivery_type = 'delivery'
     and length(trim(coalesce(p_customer_address, ''))) = 0 then
    raise exception 'ADRESSE_REQUISE';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'PANIER_VIDE';
  end if;

  -- --- Blocage ---------------------------------------------------------
  -- Par numero, et par appareil : changer de numero sur le meme
  -- telephone ne remet pas le compteur a zero.
  if exists (
    select 1 from customers
     where shop_id = p_shop_id
       and is_blocked
       and (phone = p_customer_phone
            or (p_device_id is not null and p_device_id = any(device_ids)))
  ) then
    raise exception 'CLIENT_BLOQUE';
  end if;

  -- --- Plafonds --------------------------------------------------------
  if public.commandes_ouvertes(p_shop_id, p_customer_phone) >= 2 then
    raise exception 'TROP_DE_COMMANDES_EN_COURS';
  end if;

  if p_device_id is not null
     and public.commandes_recentes_appareil(p_shop_id, p_device_id) >= 5 then
    raise exception 'TROP_DE_COMMANDES';
  end if;

  -- --- Le client -------------------------------------------------------
  insert into customers (shop_id, phone, name, device_ids)
  values (
    p_shop_id,
    p_customer_phone,
    trim(p_customer_name),
    case when p_device_id is null then '{}'::text[] else array[p_device_id] end
  )
  on conflict (shop_id, phone) do update
     set name       = excluded.name,
         updated_at = now(),
         device_ids = case
           when p_device_id is null
             or p_device_id = any(customers.device_ids)
           then customers.device_ids
           else array_append(customers.device_ids, p_device_id)
         end
  returning * into v_client;

  -- --- La commande -----------------------------------------------------
  insert into orders (
    shop_id, customer_id, device_id,
    customer_name, customer_phone, customer_address,
    delivery_type, note, subtotal, delivery_fee, total
  )
  values (
    p_shop_id, v_client.id, p_device_id,
    trim(p_customer_name), p_customer_phone,
    nullif(trim(coalesce(p_customer_address, '')), ''),
    p_delivery_type, nullif(trim(coalesce(p_note, '')), ''),
    0, 0, 0
  )
  returning id, orders.order_number into v_order_id, v_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'QUANTITE_INVALIDE';
    end if;

    select * into v_product
      from products
     where id = (v_item ->> 'product_id')::uuid
       and shop_id = p_shop_id
       and is_available;
    if not found then
      raise exception 'PRODUIT_INDISPONIBLE';
    end if;

    v_choices := coalesce(
      (select array_agg(valeur::uuid)
         from jsonb_array_elements_text(
                coalesce(v_item -> 'option_item_ids', '[]'::jsonb)
              ) as t(valeur)),
      '{}'::uuid[]
    );

    select count(*) into v_choice_count
      from option_items oi
      join option_groups og on og.id = oi.group_id
     where oi.id = any(v_choices)
       and og.product_id = v_product.id
       and oi.is_available;

    if v_choice_count <> coalesce(array_length(v_choices, 1), 0) then
      raise exception 'OPTION_INVALIDE';
    end if;

    for v_group in
      select * from option_groups where product_id = v_product.id
    loop
      select count(*) into v_group_count
        from option_items
       where group_id = v_group.id and id = any(v_choices);

      if v_group_count > v_group.max_select then
        raise exception 'TROP_D_OPTIONS';
      end if;
      if v_group.is_required
         and v_group_count < greatest(1, v_group.min_select) then
        raise exception 'OPTION_OBLIGATOIRE_MANQUANTE';
      end if;
    end loop;

    select coalesce(sum(price_delta), 0) into v_options_total
      from option_items where id = any(v_choices);

    v_line_total := (v_product.price + v_options_total) * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (
      order_id, product_id, product_name, unit_price,
      options_total, quantity, line_total, note
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.price,
      v_options_total, v_quantity, v_line_total,
      nullif(trim(coalesce(v_item ->> 'note', '')), '')
    )
    returning id into v_order_item;

    insert into order_item_options (
      order_item_id, group_name, option_name, price_delta
    )
    select v_order_item, og.name, oi.name, oi.price_delta
      from option_items oi
      join option_groups og on og.id = oi.group_id
     where oi.id = any(v_choices);
  end loop;

  if v_subtotal < v_shop.min_order then
    raise exception 'COMMANDE_MINIMUM';
  end if;

  v_delivery := case
    when p_delivery_type = 'delivery' then v_shop.delivery_fee
    else 0
  end;

  update orders
     set subtotal     = v_subtotal,
         delivery_fee = v_delivery,
         total        = v_subtotal + v_delivery
   where id = v_order_id;

  update customers
     set orders_count = orders_count + 1,
         updated_at   = now()
   where id = v_client.id;

  return query
    select v_order_id, v_number, (v_subtotal + v_delivery)::numeric;
end $$;

revoke all on function public.create_order(
  uuid, text, text, text, public.delivery_type, text, jsonb, text
) from public;

grant execute on function public.create_order(
  uuid, text, text, text, public.delivery_type, text, jsonb, text
) to anon, authenticated;
