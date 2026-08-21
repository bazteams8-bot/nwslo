import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { getMyShop } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { BoutonImprimer } from "./imprimer";

export const metadata: Metadata = { title: "Carte a imprimer — Nwslo" };
export const dynamic = "force-dynamic";

const SANS_CATEGORIE = "Autres";

export default async function CartePage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const [{ data: categories }, { data: produits }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, position")
      .eq("shop_id", shop.id)
      .order("position", { ascending: true }),
    supabase
      .from("products")
      .select(
        `id, name, description, price, image_url, category_id, position,
         option_groups (
           id, name, is_required, position,
           option_items (id, name, price_delta, position)
         )`,
      )
      .eq("shop_id", shop.id)
      .order("position", { ascending: true }),
  ]);

  const liste = produits ?? [];

  // Les produits epuises restent sur la carte imprimee : une rupture
  // dure un service, le papier dure des mois.
  const groupes = [
    ...(categories ?? []).map((c) => ({
      titre: c.name,
      produits: liste.filter((p) => p.category_id === c.id),
    })),
    { titre: SANS_CATEGORIE, produits: liste.filter((p) => !p.category_id) },
  ].filter((g) => g.produits.length > 0);

  const lien = `${await siteUrl()}/${shop.slug}`;
  const qr = await QRCode.toDataURL(lien, {
    width: 400,
    margin: 1,
    color: { dark: "#2c2c2a", light: "#ffffff" },
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-charbon">
            Carte a imprimer
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            Votre menu du moment, avec vos photos, mis en page pour du A4.
          </p>
        </div>
        <BoutonImprimer />
      </div>

      {groupes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bord bg-white p-10 text-center text-sm text-ardoise print:hidden">
          Votre carte est vide. Ajoutez des produits, puis revenez ici.
        </p>
      ) : (
        <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-creme shadow-sm print:max-w-none print:rounded-none print:shadow-none">
          {/* --- Banniere ------------------------------------------- */}
          <header className="relative h-44 bg-terracotta">
            {shop.cover_url ? (
              <Image
                src={shop.cover_url}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : null}

            {/* Voile sombre : le nom doit rester lisible quelle que
                soit la photo posee derriere. */}
            <div className="absolute inset-0 bg-charbon/45" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              {shop.logo_url ? (
                <Image
                  src={shop.logo_url}
                  alt=""
                  width={60}
                  height={60}
                  unoptimized
                  className="mb-2 h-15 w-15 rounded-full border-2 border-white object-cover"
                />
              ) : null}

              <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow">
                {shop.name}
              </h2>

              {shop.description ? (
                <p className="mt-1 text-sm text-white/90">
                  {shop.description}
                </p>
              ) : null}
            </div>
          </header>

          <div className="bg-charbon px-6 py-2 text-center text-sm text-creme">
            {shop.whatsapp_phone}
            {shop.address ? ` · ${shop.address}` : ""}
            {shop.city ? `, ${shop.city}` : ""}
          </div>

          {/* --- Les categories -------------------------------------- */}
          <div className="space-y-7 p-7">
            {groupes.map((groupe) => (
              // Une categorie coupee entre deux pages se lit mal.
              <section key={groupe.titre} className="break-inside-avoid">
                <h3 className="mb-3 flex items-center gap-3 text-lg font-bold uppercase tracking-widest text-terracotta-fonce">
                  <span className="h-px flex-1 bg-terracotta/40" />
                  {groupe.titre}
                  <span className="h-px flex-1 bg-terracotta/40" />
                </h3>

                <ul className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
                  {groupe.produits.map((produit) => {
                    const options = [...(produit.option_groups ?? [])].sort(
                      (a, b) => a.position - b.position,
                    );

                    return (
                      <li
                        key={produit.id}
                        className="flex break-inside-avoid gap-3 rounded-xl border border-bord bg-white p-2.5"
                      >
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-creme-fonce">
                          {produit.image_url ? (
                            <Image
                              src={produit.image_url}
                              alt=""
                              width={80}
                              height={80}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-semibold text-charbon">
                              {produit.name}
                            </span>
                            <span className="shrink-0 rounded-full bg-terracotta px-2 py-0.5 text-sm font-semibold text-white tabular-nums">
                              {Number(produit.price).toFixed(0)} DH
                            </span>
                          </div>

                          {produit.description ? (
                            <p className="mt-0.5 text-xs leading-snug text-ardoise">
                              {produit.description}
                            </p>
                          ) : null}

                          {options.map((groupeOption) => {
                            const choix = [
                              ...(groupeOption.option_items ?? []),
                            ]
                              .sort((a, b) => a.position - b.position)
                              .map((item) =>
                                Number(item.price_delta) === 0
                                  ? item.name
                                  : `${item.name} +${Number(item.price_delta).toFixed(0)}`,
                              );

                            if (choix.length === 0) return null;

                            return (
                              <p
                                key={groupeOption.id}
                                className="mt-0.5 text-[11px] leading-snug text-ardoise-clair"
                              >
                                <span className="font-semibold text-terracotta-fonce">
                                  {groupeOption.name} :{" "}
                                </span>
                                {choix.join(" · ")}
                              </p>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* --- Pied ------------------------------------------------- */}
          <footer className="flex break-inside-avoid items-center justify-center gap-5 bg-terracotta px-6 py-5 text-white">
            <div className="rounded-lg bg-white p-1.5">
              <Image
                src={qr}
                alt=""
                width={88}
                height={88}
                unoptimized
                className="h-22 w-22"
              />
            </div>

            <div className="text-sm">
              <p className="text-lg font-bold">Commandez en ligne</p>
              <p className="text-white/90">
                Scannez le code, choisissez, et on prepare.
              </p>
              <p className="mt-1 font-mono text-xs text-white/80">{lien}</p>
              {shop.delivery_fee > 0 ? (
                <p className="mt-1 text-white/90">
                  Livraison {Number(shop.delivery_fee).toFixed(0)} DH
                  {shop.min_order > 0
                    ? ` · minimum ${Number(shop.min_order).toFixed(0)} DH`
                    : ""}
                </p>
              ) : null}
            </div>
          </footer>
        </article>
      )}
    </>
  );
}
