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
        `id, name, description, price, category_id, position,
         option_groups (
           id, name, is_required, max_select, position,
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
      {/* Barre d'action : absente du papier. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-charbon">
            Carte a imprimer
          </h1>
          <p className="mt-1 text-sm text-ardoise">
            Votre menu du moment, mis en page pour du A4. Les prix et les
            supplements viennent de votre catalogue.
          </p>
        </div>
        <BoutonImprimer />
      </div>

      {groupes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bord bg-white p-10 text-center text-sm text-ardoise print:hidden">
          Votre carte est vide. Ajoutez des produits, puis revenez ici.
        </p>
      ) : (
        <article className="mx-auto max-w-2xl bg-white p-10 text-charbon shadow-sm print:max-w-none print:p-0 print:shadow-none">
          <header className="border-b-2 border-charbon pb-5 text-center">
            {shop.logo_url ? (
              <Image
                src={shop.logo_url}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
              />
            ) : null}

            <h2 className="text-3xl font-bold tracking-tight">{shop.name}</h2>

            {shop.description ? (
              <p className="mt-1 text-sm text-ardoise">{shop.description}</p>
            ) : null}

            <p className="mt-2 text-sm text-ardoise">
              {shop.whatsapp_phone}
              {shop.address ? ` · ${shop.address}` : ""}
              {shop.city ? `, ${shop.city}` : ""}
            </p>
          </header>

          <div className="mt-8 space-y-8">
            {groupes.map((groupe) => (
              // `break-inside-avoid` : une categorie coupee en deux
              // entre deux pages se lit mal.
              <section key={groupe.titre} className="break-inside-avoid">
                <h3 className="mb-4 text-center text-lg font-semibold uppercase tracking-widest">
                  {groupe.titre}
                </h3>

                <ul className="space-y-3">
                  {groupe.produits.map((produit) => {
                    const options = [...(produit.option_groups ?? [])].sort(
                      (a, b) => a.position - b.position,
                    );

                    return (
                      <li key={produit.id} className="break-inside-avoid">
                        {/* Ligne de points entre le nom et le prix :
                            l'oeil suit sans chercher la colonne. */}
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">{produit.name}</span>
                          <span className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-ardoise-clair" />
                          <span className="font-medium tabular-nums">
                            {Number(produit.price).toFixed(2)} DH
                          </span>
                        </div>

                        {produit.description ? (
                          <p className="mt-0.5 text-sm text-ardoise">
                            {produit.description}
                          </p>
                        ) : null}

                        {options.map((groupeOption) => {
                          const choix = [...(groupeOption.option_items ?? [])]
                            .sort((a, b) => a.position - b.position)
                            .map((item) =>
                              Number(item.price_delta) === 0
                                ? item.name
                                : `${item.name} +${Number(item.price_delta).toFixed(0)} DH`,
                            );

                          if (choix.length === 0) return null;

                          return (
                            <p
                              key={groupeOption.id}
                              className="mt-0.5 text-sm text-ardoise-clair"
                            >
                              <span className="font-medium">
                                {groupeOption.name}
                                {groupeOption.is_required ? "" : " (au choix)"}
                                {" : "}
                              </span>
                              {choix.join(" · ")}
                            </p>
                          );
                        })}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <footer className="mt-10 flex items-center justify-center gap-5 border-t-2 border-charbon pt-6">
            <Image
              src={qr}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24"
            />
            <div className="text-sm">
              <p className="font-semibold">Commandez en ligne</p>
              <p className="text-ardoise">
                Scannez le code, choisissez, et on prepare.
              </p>
              <p className="mt-1 font-mono text-xs text-ardoise">{lien}</p>
              {shop.delivery_fee > 0 ? (
                <p className="mt-1 text-ardoise">
                  Livraison {Number(shop.delivery_fee).toFixed(2)} DH
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
