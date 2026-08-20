import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

/** La boutique de l'utilisateur connecte, ou `null` s'il n'en a pas. */
export async function getMyShop() {
  const { user, supabase } = await requireUser();

  // `limit(1)` plutot que `maybeSingle()` : ce dernier leve une erreur
  // si plusieurs lignes existent, et ferait tomber tout le tableau de
  // bord au lieu d'en afficher une.
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  return { user, supabase, shop: data?.[0] ?? null };
}
