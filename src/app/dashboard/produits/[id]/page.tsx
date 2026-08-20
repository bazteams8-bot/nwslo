import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Modifier un produit — Nwslo" };

export default async function ModifierProduitPage({
  params,
}: PageProps<"/dashboard/produits/[id]">) {
  const { id } = await params;
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const [{ data: produits }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, description, price, category_id, image_url")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .limit(1),
    supabase
      .from("categories")
      .select("id, name")
      .eq("shop_id", shop.id)
      .order("position", { ascending: true }),
  ]);

  const produit = produits?.[0];
  if (!produit) notFound();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold text-charbon">
        Modifier le produit
      </h1>
      <div className="rounded-2xl border border-bord bg-white p-6">
        <ProductForm
          shopId={shop.id}
          categories={categories ?? []}
          produit={produit}
        />
      </div>
    </div>
  );
}
