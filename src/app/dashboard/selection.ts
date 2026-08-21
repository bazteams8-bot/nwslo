"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_BOUTIQUE_NOM, getMyShops } from "@/lib/auth";

/**
 * Change la boutique affichee dans le tableau de bord.
 *
 * L'identifiant est verifie contre les boutiques du gerant avant d'etre
 * pose : sans ce controle, poser le cookie a la main suffirait a lire
 * le tableau de bord de quelqu'un d'autre.
 */
export async function selectShop(formData: FormData): Promise<void> {
  const id = String(formData.get("shop_id") ?? "");
  const retour = String(formData.get("chemin") ?? "/dashboard");

  if (!id) return;

  const { shops } = await getMyShops();
  if (!shops.some((s) => s.id === id)) return;

  (await cookies()).set(COOKIE_BOUTIQUE_NOM, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Une redirection plutot qu'une revalidation : le cookie ne vaut qu'a
  // partir de la requete suivante, et revalider ici rejouerait la page
  // avec l'ancienne valeur.
  redirect(retour.startsWith("/dashboard") ? retour : "/dashboard");
}
