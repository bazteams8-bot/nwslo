import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { NewShopForm } from "./new-shop-form";
import { toggleShopActive, updateSubscription } from "./actions";

export const metadata: Metadata = { title: "Administration — Nwslo" };
export const dynamic = "force-dynamic";

const JOUR = 24 * 60 * 60 * 1000;
const BIENTOT = 3; // jours avant expiration ou l'on previent

function etatAbonnement(date: string | null) {
  if (!date) {
    return { libelle: "pas de suivi", classe: "bg-creme-fonce text-ardoise" };
  }

  const restant = Math.ceil(
    (new Date(date + "T23:59:59").getTime() - Date.now()) / JOUR,
  );

  if (restant < 0) {
    return {
      libelle: `expire depuis ${-restant} j`,
      classe: "bg-red-100 text-red-800",
    };
  }
  if (restant <= BIENTOT) {
    return {
      libelle: restant === 0 ? "expire aujourd'hui" : `expire dans ${restant} j`,
      classe: "bg-amber-100 text-amber-800",
    };
  }
  return {
    libelle: `${restant} j restants`,
    classe: "bg-vert-doux text-vert-fonce",
  };
}

export default async function AdminPage() {
  const { admin } = await requireAdmin();

  const [{ data: boutiques }, { data: produits }, { data: commandes }, comptes] =
    await Promise.all([
      admin
        .from("shops")
        .select(
          "id, name, slug, owner_id, is_active, is_open, subscription_until, created_at",
        )
        .order("created_at", { ascending: true }),
      admin.from("products").select("shop_id"),
      admin.from("orders").select("shop_id"),
      admin.auth.admin.listUsers({ perPage: 200 }),
    ]);

  const compter = (lignes: { shop_id: string }[] | null, id: string) =>
    (lignes ?? []).filter((l) => l.shop_id === id).length;

  const emailPar = new Map(
    (comptes.data?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const liste = boutiques ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-charbon">Administration</h1>
        <p className="mt-1 text-sm text-ardoise">
          {liste.length} snack{liste.length > 1 ? "s" : ""} sur la plateforme.
        </p>
      </div>

      <section className="rounded-2xl border border-bord bg-white p-5">
        <h2 className="mb-4 font-medium text-charbon">Nouveau snack</h2>
        <NewShopForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-charbon">Snacks</h2>

        {liste.map((boutique) => {
          const abonnement = etatAbonnement(boutique.subscription_until);

          return (
            <article
              key={boutique.id}
              className={`rounded-xl border bg-white p-4 ${
                boutique.is_active ? "border-bord" : "border-red-200 bg-red-50/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-charbon">
                    {boutique.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-normal ${abonnement.classe}`}
                    >
                      {abonnement.libelle}
                    </span>
                    {!boutique.is_active ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-normal text-red-800">
                        suspendu
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-ardoise">
                    {emailPar.get(boutique.owner_id) ?? "—"}
                  </p>
                  <p className="mt-0.5 text-sm text-ardoise-clair">
                    {compter(produits, boutique.id)} produits ·{" "}
                    {compter(commandes, boutique.id)} commandes ·{" "}
                    <Link
                      href={`/${boutique.slug}`}
                      className="font-mono text-terracotta hover:underline"
                    >
                      /{boutique.slug}
                    </Link>
                  </p>
                </div>

                <form action={toggleShopActive} className="shrink-0">
                  <input type="hidden" name="id" value={boutique.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(boutique.is_active)}
                  />
                  <button
                    type="submit"
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      boutique.is_active
                        ? "border-bord text-red-600 hover:border-red-200 hover:bg-red-50"
                        : "border-bord text-vert-fonce hover:bg-vert-doux"
                    }`}
                  >
                    {boutique.is_active ? "Suspendre" : "Reactiver"}
                  </button>
                </form>
              </div>

              <form
                action={updateSubscription}
                className="mt-3 flex flex-wrap items-center gap-2 border-t border-bord pt-3"
              >
                <input type="hidden" name="id" value={boutique.id} />
                <label className="text-sm text-ardoise">
                  Abonnement jusqu&apos;au
                </label>
                <input
                  type="date"
                  name="subscription_until"
                  defaultValue={boutique.subscription_until ?? ""}
                  className="rounded-lg border border-bord bg-white px-3 py-1.5 text-sm text-charbon outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-bord px-3 py-1.5 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
                >
                  Enregistrer
                </button>
              </form>
            </article>
          );
        })}
      </section>
    </div>
  );
}
