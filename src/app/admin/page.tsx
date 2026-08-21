import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { DUREES, etatQuota, PLANS, type Plan } from "@/lib/plans";
import { NewShopForm } from "./new-shop-form";
import { changePlan, renewSubscription, toggleShopActive } from "./actions";

export const metadata: Metadata = { title: "Administration — Nwslo" };
export const dynamic = "force-dynamic";

const JOUR = 24 * 60 * 60 * 1000;
const BIENTOT = 3; // jours avant expiration ou l'on previent

const CHAMP =
  "rounded-lg border border-bord bg-white px-3 py-1.5 text-sm text-charbon outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20";

/**
 * « 2026-08-23 » -> « 23 aout 2026 ».
 *
 * Le champ date s'affiche dans la langue du navigateur : en anglais il
 * montre mois/jour, ce qui se lit a l'envers ici. La date en toutes
 * lettres leve le doute.
 */
function enToutesLettres(date: string): string {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function etatAbonnement(date: string | null, essai: boolean) {
  if (!date) {
    return { libelle: "pas de suivi", classe: "bg-creme-fonce text-ardoise" };
  }

  const restant = Math.ceil(
    (new Date(date + "T23:59:59").getTime() - Date.now()) / JOUR,
  );
  const prefixe = essai ? "essai · " : "";

  if (restant < 0) {
    return {
      libelle: `${prefixe}expire depuis ${-restant} j`,
      classe: "bg-red-100 text-red-800",
    };
  }
  if (restant <= BIENTOT) {
    return {
      libelle: `${prefixe}${restant === 0 ? "expire aujourd'hui" : `expire dans ${restant} j`}`,
      classe: "bg-amber-100 text-amber-800",
    };
  }
  return {
    libelle: `${prefixe}${restant} j restants`,
    classe: "bg-vert-doux text-vert-fonce",
  };
}

const COULEUR_QUOTA = {
  ok: "bg-vert-doux text-vert-fonce",
  proche: "bg-amber-100 text-amber-800",
  depasse: "bg-red-100 text-red-800",
} as const;

export default async function AdminPage() {
  const { admin } = await requireAdmin();

  const debutDuMois = new Date();
  debutDuMois.setDate(1);
  debutDuMois.setHours(0, 0, 0, 0);

  const [{ data: boutiques }, { data: produits }, { data: commandes }, comptes] =
    await Promise.all([
      admin
        .from("shops")
        .select(
          `id, name, slug, owner_id, is_active, plan, monthly_price, is_trial,
           subscribed_at, subscription_until, created_at`,
        )
        .order("created_at", { ascending: true }),
      admin.from("products").select("shop_id"),
      admin.from("orders").select("shop_id, created_at"),
      admin.auth.admin.listUsers({ perPage: 200 }),
    ]);

  const emailPar = new Map(
    (comptes.data?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  const liste = boutiques ?? [];
  const toutesCommandes = commandes ?? [];

  const revenu = liste
    .filter((b) => b.is_active && !b.is_trial)
    .reduce((total, b) => total + Number(b.monthly_price), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-charbon">Administration</h1>
        <p className="mt-1 text-sm text-ardoise">
          {liste.length} snack{liste.length > 1 ? "s" : ""} ·{" "}
          {revenu.toFixed(0)} DH par mois
        </p>
      </div>

      <section className="rounded-2xl border border-bord bg-white p-5">
        <h2 className="mb-4 font-medium text-charbon">Nouveau snack</h2>
        <NewShopForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-charbon">Snacks</h2>

        {liste.map((boutique) => {
          const abonnement = etatAbonnement(
            boutique.subscription_until,
            boutique.is_trial,
          );

          const duMois = toutesCommandes.filter(
            (c) =>
              c.shop_id === boutique.id &&
              new Date(c.created_at) >= debutDuMois,
          ).length;

          const quota = etatQuota(boutique.plan as Plan, duMois);
          const nbProduits = (produits ?? []).filter(
            (p) => p.shop_id === boutique.id,
          ).length;

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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-normal ${COULEUR_QUOTA[quota.niveau]}`}
                    >
                      {quota.libelle}
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
                    {nbProduits} produits ·{" "}
                    <Link
                      href={`/${boutique.slug}`}
                      className="font-mono text-terracotta hover:underline"
                    >
                      /{boutique.slug}
                    </Link>
                    {boutique.subscribed_at
                      ? ` · inscrit le ${enToutesLettres(boutique.subscribed_at)}`
                      : ""}
                  </p>

                  {boutique.subscription_until ? (
                    <p className="mt-0.5 text-sm text-ardoise-clair">
                      abonnement jusqu&apos;au{" "}
                      {enToutesLettres(boutique.subscription_until)}
                    </p>
                  ) : null}

                  {quota.niveau === "depasse" ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                      Palier depasse. Si cela se repete le mois prochain,
                      proposez la formule superieure.
                    </p>
                  ) : null}
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

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-bord pt-3">
                <form
                  action={changePlan}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={boutique.id} />
                  <select
                    name="plan"
                    defaultValue={boutique.plan}
                    className={CHAMP}
                  >
                    {Object.entries(PLANS).map(([cle, p]) => (
                      <option key={cle} value={cle}>
                        {p.nom} — {p.prix} DH
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-bord px-3 py-1.5 text-sm font-medium text-charbon transition hover:bg-creme-fonce"
                  >
                    Changer
                  </button>
                </form>

                <form action={renewSubscription} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={boutique.id} />
                  <input
                    type="hidden"
                    name="current"
                    value={boutique.subscription_until ?? ""}
                  />
                  <select name="duree" defaultValue="m1" className={CHAMP}>
                    {DUREES.filter((d) => !d.essai).map((d) => (
                      <option key={d.valeur} value={d.valeur}>
                        {d.libelle}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-terracotta px-3 py-1.5 text-sm font-medium text-white transition hover:bg-terracotta-fonce"
                  >
                    Renouveler
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
