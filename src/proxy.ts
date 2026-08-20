import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Filtre applique avant le rendu des pages.
 *
 * Next.js 16 a renomme la convention `middleware.ts` en `proxy.ts` :
 * meme fonctionnement, mais le fichier et la fonction exportee ont
 * change de nom.
 */

const AUTH_ROUTES = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Non connecte sur une page du tableau de bord -> vers la connexion,
  // en gardant la destination pour y revenir apres.
  if (!user && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Deja connecte sur la page de connexion -> vers le tableau de bord.
  if (user && AUTH_ROUTES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Sans matcher, le proxy tournerait aussi sur le CSS, les images et
  // les fichiers de `public/`, ce qui casserait leur chargement.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
