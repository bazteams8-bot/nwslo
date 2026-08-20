"use server";

import { revalidatePath } from "next/cache";
import { getMyShop } from "@/lib/auth";

export type OptionState = { error: string | null };

const OK: OptionState = { error: null };

/**
 * Verifie que le produit appartient bien au snack de l'utilisateur.
 *
 * Les identifiants viennent de l'URL et des formulaires. RLS refuserait
 * deja une ecriture sur le produit d'un autre, mais autant s'arreter
 * ici plutot que de laisser passer une requete qui sera rejetee.
 */
async function produitDuGerant(productId: string) {
  const { shop, supabase } = await getMyShop();
  if (!shop) return null;

  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("shop_id", shop.id)
    .limit(1);

  return data?.[0] ? { supabase, productId } : null;
}

function rafraichir(productId: string) {
  revalidatePath(`/dashboard/produits/${productId}/options`);
}

// ---------------------------------------------------------------------
// Groupes
// ---------------------------------------------------------------------

export async function createGroup(
  _prev: OptionState,
  formData: FormData,
): Promise<OptionState> {
  const productId = String(formData.get("product_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const obligatoire = formData.get("is_required") === "on";
  const maxSelect = Number(formData.get("max_select") ?? 1);

  if (name.length < 1 || name.length > 60) {
    return { error: "Le nom doit faire entre 1 et 60 caracteres." };
  }
  if (!Number.isInteger(maxSelect) || maxSelect < 1) {
    return { error: "Le nombre de choix doit valoir au moins 1." };
  }

  const contexte = await produitDuGerant(productId);
  if (!contexte) return { error: "Produit introuvable." };

  const { data: derniere } = await contexte.supabase
    .from("option_groups")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);

  const { error } = await contexte.supabase.from("option_groups").insert({
    product_id: productId,
    name,
    is_required: obligatoire,
    // Obligatoire veut dire « au moins un choix ».
    min_select: obligatoire ? 1 : 0,
    max_select: maxSelect,
    position: (derniere?.[0]?.position ?? -1) + 1,
  });

  if (error) return { error: "Impossible d'ajouter le groupe." };

  rafraichir(productId);
  return OK;
}

export async function deleteGroup(formData: FormData): Promise<void> {
  const productId = String(formData.get("product_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const contexte = await produitDuGerant(productId);
  if (!contexte) return;

  // Les choix du groupe partent avec lui : `on delete cascade`.
  await contexte.supabase
    .from("option_groups")
    .delete()
    .eq("id", id)
    .eq("product_id", productId);

  rafraichir(productId);
}

// ---------------------------------------------------------------------
// Choix
// ---------------------------------------------------------------------

export async function createItem(
  _prev: OptionState,
  formData: FormData,
): Promise<OptionState> {
  const productId = String(formData.get("product_id") ?? "");
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const supplement = Number(
    String(formData.get("price_delta") ?? "0").replace(",", "."),
  );

  if (name.length < 1 || name.length > 60) {
    return { error: "Le nom doit faire entre 1 et 60 caracteres." };
  }
  if (!Number.isFinite(supplement)) {
    return { error: "Le supplement doit etre un nombre." };
  }

  const contexte = await produitDuGerant(productId);
  if (!contexte) return { error: "Produit introuvable." };

  // Le groupe doit appartenir a ce produit : sans ce controle, un
  // group_id bricole ajouterait un choix au produit d'un autre snack.
  const { data: groupe } = await contexte.supabase
    .from("option_groups")
    .select("id")
    .eq("id", groupId)
    .eq("product_id", productId)
    .limit(1);

  if (!groupe?.[0]) return { error: "Groupe introuvable." };

  const { data: dernier } = await contexte.supabase
    .from("option_items")
    .select("position")
    .eq("group_id", groupId)
    .order("position", { ascending: false })
    .limit(1);

  const { error } = await contexte.supabase.from("option_items").insert({
    group_id: groupId,
    name,
    price_delta: supplement,
    position: (dernier?.[0]?.position ?? -1) + 1,
  });

  if (error) return { error: "Impossible d'ajouter le choix." };

  rafraichir(productId);
  return OK;
}

export async function deleteItem(formData: FormData): Promise<void> {
  const productId = String(formData.get("product_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const contexte = await produitDuGerant(productId);
  if (!contexte) return;

  // Le choix doit relever d'un groupe de ce produit. Sans ce controle
  // on supprimerait sur simple id, en ne comptant que sur RLS.
  const { data: groupes } = await contexte.supabase
    .from("option_groups")
    .select("id")
    .eq("product_id", productId);

  const autorises = (groupes ?? []).map((g) => g.id);
  if (autorises.length === 0) return;

  await contexte.supabase
    .from("option_items")
    .delete()
    .eq("id", id)
    .in("group_id", autorises);

  rafraichir(productId);
}
