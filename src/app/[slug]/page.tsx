import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/cart";
import { MenuClient } from "./menu-client";

type Boutique = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  address: string | null;
  branch_label: string | null;
  enseigne: { name: string; slug: string } | null;
};

async function chargerBoutique(slug: string) {
  const supabase = await createClient();

  // Un seul aller-retour pour toute la carte : produits, groupes
  // d'options et choix imbriques. Interroger les options produit par
  // produit ferait autant de requetes que d'articles au menu.
  const { data } = await supabase
    .from("shops")
    .select(
      `id, name, slug, description, logo_url, cover_url,
       delivery_fee, min_order, is_open, address,
       branch_label, businesses (name, slug),
       categories (id, name, position),
       products (
         id, name, description, price, image_url, is_available, category_id, position,
         option_groups (
           id, name, is_required, min_select, max_select, position,
           option_items (id, name, price_delta, is_available, position)
         )
       )`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1);

  return data?.[0] ?? null;
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const boutique = await chargerBoutique(slug);

  if (!boutique) return { title: "Snack introuvable — Nwslo" };

  const titre = `${boutique.name} — commander`;
  const description =
    boutique.description ?? `Commandez chez ${boutique.name} sur Nwslo.`;

  // La couverture, sinon le logo. C'est cette image que WhatsApp
  // affiche quand le lien est partage — et ce lien est partage a chaque
  // commande, donc c'est la vitrine du snack plus que la page elle-meme.
  //
  // Elle passe par l'optimiseur d'images : nos fichiers sont en WebP,
  // que les robots d'apercu ne savent pas tous lire. L'optimiseur rend
  // du JPEG a qui ne demande pas explicitement du WebP, ce qui est le
  // cas des robots.
  const source = boutique.cover_url ?? boutique.logo_url;
  const image = source
    ? `/_next/image?url=${encodeURIComponent(source)}&w=1200&q=75`
    : null;

  return {
    title: titre,
    description,
    alternates: { canonical: `/${boutique.slug}` },
    openGraph: {
      type: "website",
      locale: "fr_MA",
      siteName: "Nwslo",
      url: `/${boutique.slug}`,
      title: titre,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: titre,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BoutiquePage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const boutique = await chargerBoutique(slug);
  if (!boutique) notFound();

  const categories = [...(boutique.categories ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  // Les articles epuises restent affiches, mais non commandables : le
  // client voit ce que propose le snack d'habitude.
  const produits: Product[] = [...(boutique.products ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      image_url: p.image_url,
      is_available: p.is_available,
      category_id: p.category_id,
      option_groups: [...(p.option_groups ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((g) => ({
          id: g.id,
          name: g.name,
          is_required: g.is_required,
          min_select: g.min_select,
          max_select: g.max_select,
          option_items: [...(g.option_items ?? [])]
            .filter((i) => i.is_available)
            .sort((a, b) => a.position - b.position)
            .map((i) => ({
              id: i.id,
              name: i.name,
              price_delta: Number(i.price_delta),
            })),
        })),
    }));

  // « Ouvert » au sens du client : l'interrupteur du gerant et l'heure.
  // La regle vit dans la base (migration 0009) pour que la page et le
  // refus de commande ne puissent pas diverger.
  const supabase = await createClient();
  const { data: ouvertMaintenant } = await supabase.rpc("shop_ouvert", {
    p_shop_id: boutique.id,
  });

  // Relation to-un renvoyee comme un tableau par le client Supabase,
  // meme quand `business_id` ne pointe que vers une seule enseigne.
  const enseigneBrute = Array.isArray(boutique.businesses)
    ? boutique.businesses[0]
    : boutique.businesses;

  const shop: Boutique = {
    id: boutique.id,
    name: boutique.name,
    slug: boutique.slug,
    description: boutique.description,
    logo_url: boutique.logo_url,
    cover_url: boutique.cover_url,
    delivery_fee: Number(boutique.delivery_fee),
    min_order: Number(boutique.min_order),
    is_open: ouvertMaintenant ?? boutique.is_open,
    address: boutique.address,
    branch_label: boutique.branch_label,
    enseigne: enseigneBrute
      ? { name: enseigneBrute.name, slug: enseigneBrute.slug }
      : null,
  };

  return (
    <MenuClient
      shop={shop}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      produits={produits}
    />
  );
}
