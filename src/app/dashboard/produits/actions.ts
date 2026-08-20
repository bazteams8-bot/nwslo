"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyShop } from "@/lib/auth";
import { cheminDepuisUrl } from "@/lib/images";

export type ProductState = { error: string | null };

const BUCKET = "product-images";

/** Supprime une photo devenue inutile, sans faire echouer l'appelant. */
async function oublierPhoto(
  supabase: Awaited<ReturnType<typeof getMyShop>>["supabase"],
  url: string | null,
) {
  if (!url) return;
  const chemin = cheminDepuisUrl(url, BUCKET);
  if (chemin) await supabase.storage.from(BUCKET).remove([chemin]);
}

/** Cree le produit, ou met a jour celui dont l'id est fourni. */
export async function saveProduct(formData: FormData): Promise<ProductState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const prixBrut = String(formData.get("price") ?? "").replace(",", ".");

  if (name.length < 1 || name.length > 80) {
    return { error: "Le nom doit faire entre 1 et 80 caracteres." };
  }

  const price = Number(prixBrut);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Le prix doit etre un nombre positif." };
  }

  const { shop, supabase } = await getMyShop();
  if (!shop) return { error: "Aucun snack configure." };

  const champs = {
    name,
    description: description || null,
    category_id: categoryId || null,
    price,
  };

  if (id) {
    // Modification : on relit l'ancienne photo pour pouvoir la
    // supprimer si elle vient d'etre remplacee.
    const { data: avant } = await supabase
      .from("products")
      .select("image_url")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .limit(1);

    const ancienne = avant?.[0]?.image_url ?? null;

    const { error } = await supabase
      .from("products")
      .update(imageUrl ? { ...champs, image_url: imageUrl } : champs)
      .eq("id", id)
      .eq("shop_id", shop.id);

    if (error) return { error: "Impossible d'enregistrer le produit." };

    if (imageUrl && ancienne && ancienne !== imageUrl) {
      await oublierPhoto(supabase, ancienne);
    }
  } else {
    const { data: dernier } = await supabase
      .from("products")
      .select("position")
      .eq("shop_id", shop.id)
      .order("position", { ascending: false })
      .limit(1);

    const { error } = await supabase.from("products").insert({
      ...champs,
      shop_id: shop.id,
      image_url: imageUrl || null,
      position: (dernier?.[0]?.position ?? -1) + 1,
    });

    if (error) {
      // La photo a deja ete envoyee : sans ce nettoyage elle resterait
      // dans le bucket sans qu'aucun produit ne la reference.
      await oublierPhoto(supabase, imageUrl || null);
      return { error: "Impossible de creer le produit." };
    }
  }

  revalidatePath("/dashboard/produits");
  redirect("/dashboard/produits");
}

export async function toggleAvailability(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const disponible = String(formData.get("available") ?? "") === "true";
  if (!id) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  await supabase
    .from("products")
    .update({ is_available: !disponible })
    .eq("id", id)
    .eq("shop_id", shop.id);

  revalidatePath("/dashboard/produits");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { shop, supabase } = await getMyShop();
  if (!shop) return;

  const { data: avant } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .limit(1);

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("shop_id", shop.id);

  // La photo n'est effacee qu'une fois le produit reellement supprime :
  // dans l'ordre inverse, un echec laisserait un produit sans image.
  if (!error) await oublierPhoto(supabase, avant?.[0]?.image_url ?? null);

  revalidatePath("/dashboard/produits");
}
