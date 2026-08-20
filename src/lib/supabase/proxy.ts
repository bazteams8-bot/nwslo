import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraichit la session Supabase pour une requete entrante.
 *
 * Les jetons d'acces expirent au bout d'une heure. Sans ce
 * rafraichissement, un onglet laisse ouvert se retrouverait deconnecte
 * en pleine commande. La reponse renvoyee porte les cookies mis a jour.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() valide le jeton aupres de Supabase.
  // Ne jamais se fier a getSession() ici : son contenu vient du cookie,
  // donc du navigateur, et peut avoir ete falsifie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
