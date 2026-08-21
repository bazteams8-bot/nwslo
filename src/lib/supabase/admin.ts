import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la cle de service : il ignore RLS et peut creer
 * des comptes.
 *
 * `server-only` fait echouer la compilation si ce fichier est importe
 * depuis un composant client — la cle ne peut donc pas partir dans le
 * navigateur par inadvertance.
 *
 * A n'utiliser qu'apres `requireAdmin()`. Ici, plus aucune politique de
 * securite ne protege : c'est le code appelant qui decide.
 */
export function createAdminClient() {
  const cle = process.env.SUPABASE_SECRET_KEY;

  if (!cle) {
    throw new Error(
      "SUPABASE_SECRET_KEY absente. Ajoutez-la aux variables d'environnement.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
