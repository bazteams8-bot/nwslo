import { redirect } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { getMyShop } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { QrCard } from "./qr-card";

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

  const lien = `${await siteUrl()}/${shop.slug}`;

  // 512 px : assez large pour rester net une fois imprime et scanne
  // depuis une table. La marge par defaut est trop epaisse a l'ecran.
  const qr = await QRCode.toDataURL(lien, {
    width: 512,
    margin: 2,
    color: { dark: "#2c2c2a", light: "#ffffff" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charbon">{shop.name}</h1>
        <p className="mt-1 text-sm text-ardoise-clair">
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
            className="rounded-xl border border-bord bg-white p-4"
          >
            <dt className="text-sm text-ardoise-clair">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-charbon">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <QrCard lien={lien} qr={qr} nomFichier={`qr-${shop.slug}.png`} />
    </div>
  );
}
