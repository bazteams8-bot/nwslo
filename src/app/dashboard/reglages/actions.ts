"use server";

import { revalidatePath } from "next/cache";
import { getMyShop } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cheminDepuisUrl } from "@/lib/images";

export type ReglagesState = { error: string | null; notice: string | null };

const VIDE: ReglagesState = { error: null, notice: null };

/** Garde les chiffres et un « + » initial. */
function normaliserTelephone(input: string): string {
  const compact = input.replace(/[\s.-]/g, "");
  return compact.startsWith("+")
    ? "+" + compact.slice(1).replace(/\D/g, "")
    : compact.replace(/\D/g, "");
}

export async function saveShop(
  _prev: ReglagesState,
  formData: FormData,
): Promise<ReglagesState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = normaliserTelephone(String(formData.get("whatsapp") ?? ""));
  const ouvert = formData.get("is_open") === "on";

  const frais = Number(String(formData.get("delivery_fee") ?? "0").replace(",", "."));
  const minimum = Number(String(formData.get("min_order") ?? "0").replace(",", "."));

  // Champs caches remplis par le formulaire apres l'envoi des images.
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const coverUrl = String(formData.get("cover_url") ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    return { ...VIDE, error: "Le nom doit faire entre 2 et 80 caracteres." };
  }
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return { ...VIDE, error: "Numero WhatsApp invalide." };
  }
  if (!Number.isFinite(frais) || frais < 0) {
    return { ...VIDE, error: "Le prix de livraison doit etre positif." };
  }
  if (!Number.isFinite(minimum) || minimum < 0) {
    return { ...VIDE, error: "Le minimum de commande doit etre positif." };
  }

  const { shop, supabase } = await getMyShop();
  if (!shop) return { ...VIDE, error: "Aucun snack configure." };

  const { error } = await supabase
    .from("shops")
    .update({
      name,
      description: description || null,
      address: address || null,
      city: city || null,
      whatsapp_phone: phone,
      delivery_fee: frais,
      min_order: minimum,
      is_open: ouvert,
      // Une image n'est ecrite que si une nouvelle a ete envoyee :
      // sans ce test, enregistrer sans toucher aux images les effacerait.
      ...(logoUrl ? { logo_url: logoUrl } : {}),
      ...(coverUrl ? { cover_url: coverUrl } : {}),
    })
    .eq("id", shop.id);

  if (error) {
    return { ...VIDE, error: "Impossible d'enregistrer. Reessayez." };
  }

  // Les anciennes images ne servent plus a personne.
  for (const [nouvelle, ancienne] of [
    [logoUrl, shop.logo_url],
    [coverUrl, shop.cover_url],
  ] as const) {
    if (nouvelle && ancienne && ancienne !== nouvelle) {
      const chemin = cheminDepuisUrl(ancienne, "shop-images");
      if (chemin) await supabase.storage.from("shop-images").remove([chemin]);
    }
  }

  revalidatePath("/dashboard/reglages");
  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);

  return { ...VIDE, notice: "Enregistre." };
}

export async function changePassword(
  _prev: ReglagesState,
  formData: FormData,
): Promise<ReglagesState> {
  const actuel = String(formData.get("current_password") ?? "");
  const nouveau = String(formData.get("new_password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (nouveau.length < 8) {
    return { ...VIDE, error: "Le nouveau mot de passe doit faire au moins 8 caracteres." };
  }
  if (nouveau !== confirmation) {
    return { ...VIDE, error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ...VIDE, error: "Session expiree. Reconnectez-vous." };
  }

  // On revalide le mot de passe actuel avant de le remplacer. Supabase
  // ne l'exige pas : sans ce controle, quelqu'un passant devant un
  // ecran reste connecte pourrait verrouiller le gerant hors de son
  // propre compte.
  const { error: erreurActuel } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: actuel,
  });

  if (erreurActuel) {
    return { ...VIDE, error: "Mot de passe actuel incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: nouveau });

  if (error) {
    return {
      ...VIDE,
      error: /different from the old/i.test(error.message)
        ? "Le nouveau mot de passe doit etre different de l'ancien."
        : "Impossible de changer le mot de passe. Reessayez.",
    };
  }

  return { ...VIDE, notice: "Mot de passe modifie." };
}
