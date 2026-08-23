import type { MetadataRoute } from "next";

/**
 * Le manifeste qui rend Nwslo installable.
 *
 * Il ne sert pas a faire joli : sur iPhone, les notifications push
 * n'existent que pour une application installee sur l'ecran d'accueil.
 * Sans ce fichier, un gerant sur iOS ne peut pas etre prevenu d'une
 * commande, quoi qu'on fasse cote serveur.
 *
 * `start_url` pointe sur les commandes : quand le gerant ouvre
 * l'icone, c'est ce qu'il vient voir, pas une page d'accueil.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nwslo — mes commandes",
    short_name: "Nwslo",
    description:
      "Recevez vos commandes et suivez-les, meme telephone verrouille.",
    start_url: "/dashboard/commandes",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf8f0",
    theme_color: "#d85a30",
    lang: "fr",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // `maskable` : les lanceurs Android rognent l'icone en cercle ou
      // en losange. Sans cette variante, le repere se fait couper.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
