"use server";

import { revalidatePath } from "next/cache";
import { getMyShop } from "@/lib/auth";

const STATUTS = [
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

  await supabase
    .from("orders")
    .update({ status: statut })
    .eq("id", id)
    .eq("shop_id", shop.id);

  revalidatePath("/dashboard/commandes");
}
