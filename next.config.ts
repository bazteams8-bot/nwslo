import type { NextConfig } from "next";

// next/image refuse par defaut les images hebergees ailleurs. On
// autorise uniquement le domaine Supabase du projet, lu depuis
// l'environnement pour ne pas figer l'URL dans le depot.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
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
