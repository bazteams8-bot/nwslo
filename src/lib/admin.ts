import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifie que le visiteur administre la plateforme, puis rend un client
 * a pleins pouvoirs.
 *
 * Repond 404 et non 403 a un non-administrateur : un gerant de snack qui
 * tomberait sur l'adresse n'apprend meme pas que la page existe.
 */
export async function requireAdmin() {
  const { user, supabase } = await requireUser();

  // Lu avec la session du visiteur : la politique RLS ne laisse voir
  // que sa propre ligne, donc la reponse ne peut pas etre falsifiee
  // depuis le navigateur.
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1);

  if (!data?.length) notFound();

  return { user, admin: createAdminClient() };
}
