import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { CommandesClient, type Commande } from "./commandes-client";

export const metadata: Metadata = { title: "Commandes — Nwslo" };

// Les commandes arrivent en direct : rien ne doit etre servi depuis un
// cache, sinon le gerant verrait une liste d'il y a cinq minutes.
export const dynamic = "force-dynamic";

export default async function CommandesPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const { data } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_name, customer_phone, customer_address, customer_id,
       delivery_type, note, subtotal, delivery_fee, total, status, created_at,
       customers (id, orders_count, no_show_count, is_blocked),
       order_items (
         id, product_name, unit_price, options_total, quantity, line_total, note,
         order_item_options (id, group_name, option_name, price_delta)
       )`,
    )
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const commandes: Commande[] = (data ?? []).map((c) => ({
    id: c.id,
    order_number: c.order_number,
    customer_name: c.customer_name,
    customer_phone: c.customer_phone,
    customer_address: c.customer_address,
    delivery_type: c.delivery_type,
    note: c.note,
    subtotal: Number(c.subtotal),
    delivery_fee: Number(c.delivery_fee),
    total: Number(c.total),
    status: c.status,
    created_at: c.created_at,
    // La relation est typee comme une liste alors qu'il n'y a qu'un
    // client par commande : on prend le premier.
    client: (() => {
      const fiche = Array.isArray(c.customers) ? c.customers[0] : c.customers;
      return fiche
        ? {
            id: fiche.id,
            commandes: fiche.orders_count,
            absences: fiche.no_show_count,
            bloque: fiche.is_blocked,
          }
        : null;
    })(),
    items: (c.order_items ?? []).map((i) => ({
      id: i.id,
      product_name: i.product_name,
      quantity: i.quantity,
      line_total: Number(i.line_total),
      note: i.note,
      options: (i.order_item_options ?? []).map((o) => ({
        id: o.id,
        group_name: o.group_name,
        option_name: o.option_name,
        price_delta: Number(o.price_delta),
      })),
    })),
  }));

  return <CommandesClient shopId={shop.id} commandes={commandes} />;
}
