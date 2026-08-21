import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Cookie qui retient la boutique en cours quand le gerant en a plusieurs. */
const COOKIE_BOUTIQUE = "nwslo-shop";

/**
 * Renvoie l'utilisateur connecte, ou redirige vers la connexion.
 *
 * Le proxy filtre deja `/dashboard`, mais il se contente de lire le
 * cookie. Cette verification-ci interroge Supabase et sert de garde
 * reelle : c'est elle qui protege les donnees, pas la redirection.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { user, supabase };
}

/** Toutes les boutiques du gerant, la plus ancienne d'abord. */
export async function getMyShops() {
  const { user, supabase } = await requireUser();

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return { user, supabase, shops: data ?? [] };
}

/**
 * La boutique en cours.
 *
 * Un gerant peut avoir plusieurs snacks ; le cookie dit lequel il
 * regarde. Sa valeur est verifiee contre la liste de ses boutiques :
 * un cookie bricole ne donne acces a rien, il retombe sur la premiere.
 */
export async function getMyShop() {
  const { user, supabase, shops } = await getMyShops();

  const choisie = (await cookies()).get(COOKIE_BOUTIQUE)?.value;
  const shop = shops.find((s) => s.id === choisie) ?? shops[0] ?? null;

  return { user, supabase, shop, shops };
}

/** Le nom du cookie, pour l'action qui le pose. */
export const COOKIE_BOUTIQUE_NOM = COOKIE_BOUTIQUE;
