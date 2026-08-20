"use server";

import { revalidatePath } from "next/cache";
import { getMyShop } from "@/lib/auth";

export type MenuState = { error: string | null };

const OK: MenuState = { error: null };

export async function createCategory(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    return { error: "Le nom doit faire entre 1 et 60 caracteres." };
  }

  const { shop, supabase } = await getMyShop();
  if (!shop) return { error: "Aucun snack configure." };

  // Nouvelle categorie a la fin de la liste.
  const { data: derniere } = await supabase
    .from("categories")
    .select("position")
    .eq("shop_id", shop.id)
    .order("position", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("categories").insert({
    shop_id: shop.id,
    name,
    position: (derniere?.[0]?.position ?? -1) + 1,
  });

  if (error) return { error: "Impossible d'ajouter la categorie." };

  revalidatePath("/dashboard/menu");
  return OK;
}

export async function renameCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  // Le filtre shop_id double la protection RLS : meme si une politique
  // etait relachee un jour, on ne toucherait pas au snack d'un autre.
  await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("shop_id", shop.id);

  revalidatePath("/dashboard/menu");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  // Les produits de la categorie ne sont pas supprimes : la cle
  // etrangere est en `on delete set null`, ils se retrouvent simplement
  // sans categorie.
  await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("shop_id", shop.id);

  revalidatePath("/dashboard/menu");
}

/** Deplace une categorie d'un cran, en echangeant sa position avec sa voisine. */
export async function moveCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  const { data: toutes } = await supabase
    .from("categories")
    .select("id, position")
    .eq("shop_id", shop.id)
    .order("position", { ascending: true });

  if (!toutes) return;

  const index = toutes.findIndex((c) => c.id === id);
  const cible = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || cible < 0 || cible >= toutes.length) return;

  const a = toutes[index];
  const b = toutes[cible];

  await Promise.all([
    supabase
      .from("categories")
      .update({ position: b.position })
      .eq("id", a.id)
      .eq("shop_id", shop.id),
    supabase
      .from("categories")
      .update({ position: a.position })
      .eq("id", b.id)
      .eq("shop_id", shop.id),
  ]);

  revalidatePath("/dashboard/menu");
}
