import type { NextConfig } from "next";

// next/image refuse par defaut les images hebergees ailleurs. On
// autorise uniquement le domaine Supabase du projet, lu depuis
// l'environnement pour ne pas figer l'URL dans le depot.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // En developpement, Next.js ne sert ses fichiers qu'a `localhost` et
  // bloque toute autre origine. Depuis un telephone sur le meme wifi,
  // la page arrive donc rendue mais sans son JavaScript : elle
  // s'affiche, et aucun bouton ne repond.
  //
  // On autorise les adresses privees pour pouvoir tester sur mobile.
  // Sans effet en production, ou cette protection ne s'applique pas.
  allowedDevOrigins: ["192.168.1.*", "192.168.*.*", "10.*.*.*"],

  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
