"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  ajouterDuree,
  estEssai,
  PLANS,
  type Duree,
  type Plan,
} from "@/lib/plans";

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

const jour = (d: Date) => d.toISOString().slice(0, 10);

export async function createShopForClient(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nom = String(formData.get("name") ?? "").trim();
  const phone = normaliserTelephone(String(formData.get("whatsapp") ?? ""));
  const frais = Number(String(formData.get("delivery_fee") ?? "0").replace(",", "."));
  const plan = String(formData.get("plan") ?? "essentiel") as Plan;
  const duree = String(formData.get("duree") ?? "trial30") as Duree;
  const inscription = String(formData.get("subscribed_at") ?? "").trim();

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
  if (!PLANS[plan]) {
    return { ...VIDE, error: "Formule inconnue." };
  }

  const debut = inscription ? new Date(inscription + "T12:00:00") : new Date();
  if (Number.isNaN(debut.getTime())) {
    return { ...VIDE, error: "Date d'inscription invalide." };
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

  const base = slugifier(nom) || "snack";

  for (let essai = 0; essai < 5; essai++) {
    const slug = essai === 0 ? base : `${base}-${essai + 1}`;

    const { error } = await admin.from("shops").insert({
      owner_id: compte.user.id,
      name: nom,
      slug,
      whatsapp_phone: phone,
      delivery_fee: frais,
      plan,
      monthly_price: PLANS[plan].prix,
      is_trial: estEssai(duree),
      subscribed_at: jour(debut),
      subscription_until: jour(ajouterDuree(debut, duree)),
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

/**
 * Prolonge l'abonnement de la duree choisie.
 *
 * Le point de depart est la fin en cours si elle n'est pas passee,
 * sinon aujourd'hui : un client qui paie en avance ne perd pas les
 * jours restants, et un client en retard repart d'un mois entier plutot
 * que d'un mois deja a moitie consomme.
 *
 * Prolonger met fin a l'essai : on ne prolonge pas du gratuit.
 */
export async function renewSubscription(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const actuelle = String(formData.get("current") ?? "");
  const duree = String(formData.get("duree") ?? "m1") as Duree;
  if (!id) return;

  const aujourdhui = new Date();
  const depart =
    actuelle && new Date(actuelle + "T12:00:00") > aujourdhui
      ? new Date(actuelle + "T12:00:00")
      : aujourdhui;

  const { admin } = await requireAdmin();
  await admin
    .from("shops")
    .update({
      subscription_until: jour(ajouterDuree(depart, duree)),
      is_trial: false,
    })
    .eq("id", id);

  revalidatePath("/admin");
}

/** Change la formule, et aligne le prix sur celui du palier. */
export async function changePlan(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const plan = String(formData.get("plan") ?? "") as Plan;
  if (!id || !PLANS[plan]) return;

  const { admin } = await requireAdmin();
  await admin
    .from("shops")
    .update({ plan, monthly_price: PLANS[plan].prix })
    .eq("id", id);

  revalidatePath("/admin");
}

export type ResetState = { error: string | null; motDePasse: string | null };

/**
 * Donne un nouveau mot de passe temporaire au gerant d'une boutique.
 *
 * Remplace le parcours « mot de passe oublie » : avec une poignee de
 * clients, un bouton ici coute moins qu'un envoi d'e-mail a configurer,
 * et ne depend pas d'un message qui finirait en indesirables.
 */
export async function resetClientPassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Snack introuvable.", motDePasse: null };

  const { admin } = await requireAdmin();

  const { data: boutiques } = await admin
    .from("shops")
    .select("owner_id")
    .eq("id", id)
    .limit(1);

  const proprietaire = boutiques?.[0]?.owner_id;
  if (!proprietaire) {
    return { error: "Snack introuvable.", motDePasse: null };
  }

  const motDePasse = motDePasseTemporaire();

  const { error } = await admin.auth.admin.updateUserById(proprietaire, {
    password: motDePasse,
  });

  if (error) {
    return { error: "Impossible de changer le mot de passe.", motDePasse: null };
  }

  return { error: null, motDePasse };
}
