import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";

export const metadata: Metadata = { title: "Tableau de bord — Nwslo" };

export default async function DashboardPage() {
  const { shop, supabase } = await getMyShop();

  // Premiere visite : aucun magasin n'existe encore pour ce compte.
  if (!shop) redirect("/dashboard/nouveau-magasin");

  // `head: true` ne ramene que le compte, pas les lignes.
  const [commandes, produits] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{shop.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {shop.is_open ? "Ouvert" : "Ferme"} ·{" "}
          {shop.delivery_fee > 0
            ? `livraison ${Number(shop.delivery_fee).toFixed(2)} DH`
            : "livraison gratuite"}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Commandes", value: String(commandes.count ?? 0) },
          { label: "Produits", value: String(produits.count ?? 0) },
          {
            label: "Livraison",
            value: `${Number(shop.delivery_fee).toFixed(2)} DH`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <dt className="text-sm text-slate-500">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium text-slate-900">Votre lien de commande</h2>
        <p className="mt-1 text-sm text-slate-500">
          C&apos;est l&apos;adresse a partager avec vos clients.
        </p>
        <Link
          href={`/${shop.slug}`}
          className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-emerald-700 transition hover:bg-slate-50"
        >
          /{shop.slug}
        </Link>
      </div>
    </div>
  );
}
