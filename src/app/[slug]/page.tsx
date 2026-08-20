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
  delivery_fee: number;
  min_order: number;
  is_open: boolean;
  address: string | null;
};

async function chargerBoutique(slug: string) {
  const supabase = await createClient();

  // Un seul aller-retour pour toute la carte : produits, groupes
  // d'options et choix imbriques. Interroger les options produit par
  // produit ferait autant de requetes que d'articles au menu.
  const { data } = await supabase
    .from("shops")
    .select(
      `id, name, slug, description, delivery_fee, min_order, is_open, address,
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

  return {
    title: `${boutique.name} — commander`,
    description:
      boutique.description ?? `Commandez chez ${boutique.name} sur Nwslo.`,
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

  const shop: Boutique = {
    id: boutique.id,
    name: boutique.name,
    slug: boutique.slug,
    description: boutique.description,
    delivery_fee: Number(boutique.delivery_fee),
    min_order: Number(boutique.min_order),
    is_open: boutique.is_open,
    address: boutique.address,
  };

  return (
    <MenuClient
      shop={shop}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      produits={produits}
    />
  );
}
