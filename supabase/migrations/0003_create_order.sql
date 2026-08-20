-- =====================================================================
-- Nwslo — enregistrement d'une commande
--
-- Le client n'a aucun droit d'ecriture sur `orders` (voir 0001). Il
-- appelle cette fonction, qui ne lui demande que « quels produits, en
-- quelle quantite, avec quelles options ». Tous les prix sont relus
-- dans la base : un total envoye par le navigateur ne serait jamais
-- lu, donc jamais croyable.
-- =====================================================================

create or replace function public.create_order(
  p_shop_id          uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_delivery_type    public.delivery_type,
  p_note             text,
  p_items            jsonb
)
returns table (order_id uuid, order_number text, order_total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop          shops%rowtype;
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
  -- --- La boutique ---------------------------------------------------
  select * into v_shop from shops where id = p_shop_id and is_active;
  if not found then
    raise exception 'SNACK_INTROUVABLE';
  end if;
  if not v_shop.is_open then
    raise exception 'SNACK_FERME';
  end if;

  -- --- Le client -----------------------------------------------------
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

  -- --- La commande, totaux provisoires --------------------------------
  -- Elle est creee d'abord pour disposer de son id ; les totaux sont
  -- ecrits une fois les lignes parcourues.
  insert into orders (
    shop_id, customer_name, customer_phone, customer_address,
    delivery_type, note, subtotal, delivery_fee, total
  )
  values (
    p_shop_id, trim(p_customer_name), p_customer_phone,
    nullif(trim(coalesce(p_customer_address, '')), ''),
    p_delivery_type, nullif(trim(coalesce(p_note, '')), ''),
    0, 0, 0
  )
  returning id, orders.order_number into v_order_id, v_number;

  -- --- Les lignes -----------------------------------------------------
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'QUANTITE_INVALIDE';
    end if;

    -- Le produit doit appartenir a cette boutique et etre disponible.
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

    -- Chaque option retenue doit appartenir a ce produit et etre
    -- disponible. Sans ce controle, on pourrait coller a un tacos une
    -- option prise chez un autre snack — ou une option a prix negatif.
    select count(*) into v_choice_count
      from option_items oi
      join option_groups og on og.id = oi.group_id
     where oi.id = any(v_choices)
       and og.product_id = v_product.id
       and oi.is_available;

    if v_choice_count <> coalesce(array_length(v_choices, 1), 0) then
      raise exception 'OPTION_INVALIDE';
    end if;

    -- Les regles du menu s'appliquent aussi ici : un groupe
    -- obligatoire doit etre rempli, et aucun ne peut deborder.
    for v_group in
      select * from option_groups where product_id = v_product.id
    loop
      select count(*) into v_group_count
        from option_items
       where group_id = v_group.id
         and id = any(v_choices);

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

    -- Nom et prix sont recopies : la ligne doit rester lisible meme si
    -- le produit change de prix ou disparait de la carte.
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

  -- --- Totaux definitifs ----------------------------------------------
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

  return query
    select v_order_id, v_number, (v_subtotal + v_delivery)::numeric;
end $$;

-- Par defaut une fonction est executable par tout le monde ; on le
-- rend explicite plutot que de s'en remettre a la valeur par defaut.
revoke all on function public.create_order(
  uuid, text, text, text, public.delivery_type, text, jsonb
) from public;

grant execute on function public.create_order(
  uuid, text, text, text, public.delivery_type, text, jsonb
) to anon, authenticated;
