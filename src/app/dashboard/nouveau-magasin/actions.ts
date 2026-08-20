"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export type ShopState = { error: string | null };

/** « Snack Al Atlas » -> « snack-al-atlas » */
function slugifier(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Garde les chiffres et un « + » initial : « 06 12 34 56 78 » -> « 0612345678 » */
function normaliserTelephone(input: string): string {
  const compact = input.replace(/[\s.-]/g, "");
  return compact.startsWith("+")
    ? "+" + compact.slice(1).replace(/\D/g, "")
    : compact.replace(/\D/g, "");
}

export async function createShop(
  _prev: ShopState,
  formData: FormData,
): Promise<ShopState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = normaliserTelephone(String(formData.get("whatsapp") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  const feeRaw = String(formData.get("delivery_fee") ?? "0").replace(",", ".");

  if (name.length < 2) {
    return { error: "Le nom du snack doit faire au moins 2 caracteres." };
  }
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return {
      error: "Numero WhatsApp invalide. Exemple : 0612345678 ou +212612345678.",
    };
  }

  const fee = Number(feeRaw);
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "Le prix de livraison doit etre un nombre positif." };
  }

  const { user, supabase } = await requireUser();

  // Un compte = un snack. Sans ce garde-fou, un double envoi du
  // formulaire creerait deux magasins pour le meme gerant.
  const { data: existant } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (existant?.length) redirect("/dashboard");

  let base = slugifier(name);
  // Un nom entierement en arabe ne laisse rien apres translitteration.
  if (!base) base = "snack";

  // L'adresse doit rester unique sur tout le site : en cas de collision
  // (code 23505), on retente avec un suffixe.
  for (let essai = 0; essai < 5; essai++) {
    const slug = essai === 0 ? base : `${base}-${essai + 1}`;

    const { error } = await supabase.from("shops").insert({
      owner_id: user.id,
      name,
      slug,
      whatsapp_phone: phone,
      address: address || null,
      delivery_fee: fee,
    });

    if (!error) {
      revalidatePath("/dashboard");
      redirect("/dashboard");
    }

    if (error.code !== "23505") {
      return { error: "Impossible de creer le snack. Reessayez." };
    }
  }

  return { error: "Ce nom est deja pris. Essayez-en un autre." };
}
