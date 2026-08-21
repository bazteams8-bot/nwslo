"use server";

import { revalidatePath } from "next/cache";
import { getMyShop } from "@/lib/auth";

const STATUTS = [
  "no_show",
  "new",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type Statut = (typeof STATUTS)[number];

export async function updateStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const statut = String(formData.get("status") ?? "");

  // Le statut vient d'un champ cache : on le compare a la liste connue
  // plutot que de le passer tel quel a la base.
  if (!id || !STATUTS.includes(statut as Statut)) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  // On relit l'etat actuel : passer deux fois par « non recuperee »
  // ne doit compter qu'une absence.
  const { data: avant } = await supabase
    .from("orders")
    .select("status, customer_id")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .limit(1);

  const precedent = avant?.[0];
  if (!precedent) return;

  await supabase
    .from("orders")
    .update({ status: statut })
    .eq("id", id)
    .eq("shop_id", shop.id);

  if (
    statut === "no_show" &&
    precedent.status !== "no_show" &&
    precedent.customer_id
  ) {
    const { data: client } = await supabase
      .from("customers")
      .select("no_show_count")
      .eq("id", precedent.customer_id)
      .limit(1);

    if (client?.[0]) {
      await supabase
        .from("customers")
        .update({ no_show_count: client[0].no_show_count + 1 })
        .eq("id", precedent.customer_id)
        .eq("shop_id", shop.id);
    }
  }

  revalidatePath("/dashboard/commandes");
}

/** Bloque ou debloque un numero pour cette boutique. */
export async function toggleCustomerBlock(formData: FormData): Promise<void> {
  const id = String(formData.get("customer_id") ?? "");
  const bloque = String(formData.get("blocked") ?? "") === "true";
  if (!id) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  await supabase
    .from("customers")
    .update({ is_blocked: !bloque })
    .eq("id", id)
    .eq("shop_id", shop.id);

  revalidatePath("/dashboard/commandes");
}
