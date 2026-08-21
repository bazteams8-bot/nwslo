import { headers } from "next/headers";

/**
 * Adresse publique du site, deduite de la requete en cours.
 *
 * Lue dans les en-tetes plutot que codee en dur : la meme page doit
 * produire un lien vers localhost en developpement et vers le domaine
 * reel en production, sans reglage a maintenir.
 */
export async function siteUrl(): Promise<string> {
  const h = await headers();

  // Derriere le proxy de Vercel, `host` porte l'hote interne : ce sont
  // les en-tetes `x-forwarded-*` qui portent le domaine du visiteur.
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocole =
    h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");

  return `${protocole}://${hote}`;
}
