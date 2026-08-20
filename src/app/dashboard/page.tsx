import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";

export const metadata: Metadata = { title: "Tableau de bord — Nwslo" };

export default async function DashboardPage() {
  const { shop } = await getMyShop();

  // Premiere visite : aucun magasin n'existe encore pour ce compte.
  if (!shop) redirect("/dashboard/nouveau-magasin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{shop.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          nwslo.ma/{shop.slug}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Commandes", value: "0" },
          { label: "Produits", value: "0" },
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

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">
          Le menu et les commandes arrivent a la prochaine etape.
        </p>
      </div>
    </div>
  );
}
