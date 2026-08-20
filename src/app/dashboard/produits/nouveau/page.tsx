import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Nouveau produit — Nwslo" };

export default async function NouveauProduitPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("shop_id", shop.id)
    .order("position", { ascending: true });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        Nouveau produit
      </h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ProductForm shopId={shop.id} categories={categories ?? []} />
      </div>
    </div>
  );
}
