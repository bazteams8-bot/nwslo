"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export type AdminState = {
  error: string | null;
  identifiants: { email: string; motDePasse: string; lien: string } | null;
};

const VIDE: AdminState = { error: null, identifiants: null };

/** « Snack Al Amal » -> « snack-al-amal » */
function slugifier(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normaliserTelephone(input: string): string {
  const compact = input.replace(/[\s.-]/g, "");
  return compact.startsWith("+")
    ? "+" + compact.slice(1).replace(/\D/g, "")
    : compact.replace(/\D/g, "");
}

/**
 * Mot de passe lisible a dicter au telephone : pas de O/0 ni de l/1,
 * qu'on se recopie de travers.
 */
function motDePasseTemporaire(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const octets = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join("");
}

export async function createShopForClient(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("name") ?? "").trim();
  const phone = normaliserTelephone(String(formData.get("whatsapp") ?? ""));
  const frais = Number(String(formData.get("delivery_fee") ?? "0").replace(",", "."));
  const abonnement = String(formData.get("subscription_until") ?? "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ...VIDE, error: "Adresse e-mail invalide." };
  }
  if (nom.length < 2 || nom.length > 80) {
    return { ...VIDE, error: "Le nom doit faire entre 2 et 80 caracteres." };
  }
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return { ...VIDE, error: "Numero WhatsApp invalide." };
  }
  if (!Number.isFinite(frais) || frais < 0) {
    return { ...VIDE, error: "Le prix de livraison doit etre positif." };
  }

  const { admin } = await requireAdmin();

  const motDePasse = motDePasseTemporaire();

  // `email_confirm: true` : le compte est cree deja confirme. C'est ce
  // qui evite de faire passer le client par un e-mail de validation
  // alors que c'est nous qui montons sa boutique.
  const { data: compte, error: erreurCompte } =
    await admin.auth.admin.createUser({
      email,
      password: motDePasse,
      email_confirm: true,
    });

  if (erreurCompte || !compte?.user) {
    const message = (erreurCompte?.message ?? "").toLowerCase();
    return {
      ...VIDE,
      error: message.includes("already")
        ? "Un compte existe deja avec cet e-mail."
        : "Impossible de creer le compte.",
    };
  }

  let base = slugifier(nom) || "snack";
  let slug = base;

  for (let essai = 0; essai < 5; essai++) {
    slug = essai === 0 ? base : `${base}-${essai + 1}`;

    const { error } = await admin.from("shops").insert({
      owner_id: compte.user.id,
      name: nom,
      slug,
      whatsapp_phone: phone,
      delivery_fee: frais,
      subscription_until: abonnement || null,
    });

    if (!error) {
      revalidatePath("/admin");
      return {
        error: null,
        identifiants: { email, motDePasse, lien: `/${slug}` },
      };
    }

    if (error.code !== "23505") {
      // Le compte existe deja mais la boutique a echoue : on le retire
      // pour ne pas laisser un compte orphelin qui bloquerait l'e-mail.
      await admin.auth.admin.deleteUser(compte.user.id);
      return { ...VIDE, error: "Impossible de creer le snack." };
    }
  }

  await admin.auth.admin.deleteUser(compte.user.id);
  return { ...VIDE, error: "Ce nom est deja pris. Essayez-en un autre." };
}

export async function toggleShopActive(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const actif = String(formData.get("active") ?? "") === "true";
  if (!id) return;

  const { admin } = await requireAdmin();
  await admin.from("shops").update({ is_active: !actif }).eq("id", id);

  revalidatePath("/admin");
}

export async function updateSubscription(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("subscription_until") ?? "").trim();
  if (!id) return;

  const { admin } = await requireAdmin();
  await admin
    .from("shops")
    .update({ subscription_until: date || null })
    .eq("id", id);

  revalidatePath("/admin");
}
