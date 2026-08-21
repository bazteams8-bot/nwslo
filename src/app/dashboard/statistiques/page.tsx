import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { formaterDh } from "@/lib/cart";

export const metadata: Metadata = { title: "Statistiques — Nwslo" };
export const dynamic = "force-dynamic";

type Commande = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

function debutDuMois(decalage = 0): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** « +32 % », « -8 % », ou rien quand il n'y a pas de quoi comparer. */
function evolution(actuel: number, precedent: number): string | null {
  if (precedent === 0) return actuel > 0 ? "premier mois" : null;
  const variation = Math.round(((actuel - precedent) / precedent) * 100);
  if (variation === 0) return "stable";
  return `${variation > 0 ? "+" : ""}${variation} % vs mois dernier`;
}

export default async function StatistiquesPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const moisEnCours = debutDuMois();
  const moisPrecedent = debutDuMois(-1);

  // Deux mois suffisent pour tout ce qui est affiche ici, et evitent de
  // ramener tout l'historique a chaque visite.
  const { data } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("shop_id", shop.id)
    .gte("created_at", moisPrecedent.toISOString())
    .order("created_at", { ascending: true });

  const toutes: Commande[] = (data ?? []).map((c) => ({
    id: c.id,
    total: Number(c.total),
    status: c.status,
    created_at: c.created_at,
  }));

  const duMois = toutes.filter((c) => new Date(c.created_at) >= moisEnCours);
  const duMoisDernier = toutes.filter(
    (c) => new Date(c.created_at) < moisEnCours,
  );

  // Une commande annulee n'a rien rapporte : elle compte dans le volume,
  // jamais dans le chiffre.
  const encaisse = (liste: Commande[]) =>
    liste
      .filter((c) => c.status !== "cancelled")
      .reduce((total, c) => total + c.total, 0);

  const chiffre = encaisse(duMois);
  const chiffrePrecedent = encaisse(duMoisDernier);

  const honorees = duMois.filter((c) => c.status !== "cancelled");
  const panier = honorees.length ? chiffre / honorees.length : 0;
  const annulees = duMois.filter((c) => c.status === "cancelled").length;

  // Produits les plus vendus : uniquement sur les commandes du mois.
  const idsDuMois = duMois.map((c) => c.id);
  const { data: lignes } = idsDuMois.length
    ? await supabase
        .from("order_items")
        .select("product_name, quantity, line_total, order_id")
        .in("order_id", idsDuMois.slice(0, 500))
    : { data: [] };

  const parProduit = new Map<string, { quantite: number; total: number }>();
  for (const ligne of lignes ?? []) {
    const actuel = parProduit.get(ligne.product_name) ?? {
      quantite: 0,
      total: 0,
    };
    actuel.quantite += ligne.quantity;
    actuel.total += Number(ligne.line_total);
    parProduit.set(ligne.product_name, actuel);
  }

  const meilleurs = [...parProduit.entries()]
    .sort((a, b) => b[1].quantite - a[1].quantite)
    .slice(0, 8);

  // Une barre par jour ecoule du mois.
  const aujourdhui = new Date();
  const jours = Array.from({ length: aujourdhui.getDate() }, (_, i) => {
    const jour = i + 1;
    return {
      jour,
      nombre: duMois.filter((c) => new Date(c.created_at).getDate() === jour)
        .length,
    };
  });
  const maximum = Math.max(1, ...jours.map((j) => j.nombre));

  const tendance = evolution(duMois.length, duMoisDernier.length);

  const chiffres = [
    {
      label: "Commandes ce mois-ci",
      valeur: String(duMois.length),
      note: tendance,
    },
    {
      label: "Encaisse",
      valeur: formaterDh(chiffre),
      note: evolution(chiffre, chiffrePrecedent),
    },
    { label: "Panier moyen", valeur: formaterDh(panier), note: null },
    {
      label: "Annulees",
      valeur: String(annulees),
      note: annulees > 0 ? "non comptees dans l'encaisse" : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charbon">Statistiques</h1>
        <p className="mt-1 text-sm text-ardoise">
          {new Date().toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {chiffres.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-bord bg-white p-4"
          >
            <dt className="text-sm text-ardoise">{c.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-charbon">
              {c.valeur}
            </dd>
            {c.note ? (
              <p className="mt-0.5 text-xs text-ardoise-clair">{c.note}</p>
            ) : null}
          </div>
        ))}
      </dl>

      <section className="rounded-xl border border-bord bg-white p-5">
        <h2 className="mb-4 font-medium text-charbon">Commandes par jour</h2>

        {duMois.length === 0 ? (
          <p className="py-8 text-center text-sm text-ardoise">
            Aucune commande ce mois-ci pour l&apos;instant.
          </p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {jours.map((j) => (
              <div
                key={j.jour}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${j.jour} : ${j.nombre} commande${j.nombre > 1 ? "s" : ""}`}
              >
                <span className="text-xs text-ardoise-clair">
                  {j.nombre > 0 ? j.nombre : ""}
                </span>
                <div
                  className="w-full rounded-t bg-terracotta"
                  style={{
                    height: `${Math.max(2, (j.nombre / maximum) * 100)}%`,
                    opacity: j.nombre === 0 ? 0.15 : 1,
                  }}
                />
                <span className="text-[10px] text-ardoise-clair">{j.jour}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-bord bg-white">
        <h2 className="border-b border-bord px-5 py-3 font-medium text-charbon">
          Les plus commandes ce mois-ci
        </h2>

        {meilleurs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ardoise">
            Rien a classer pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-bord">
            {meilleurs.map(([nom, stats], rang) => (
              <li
                key={nom}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <span className="w-5 text-sm text-ardoise-clair">
                  {rang + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-charbon">
                  {nom}
                </span>
                <span className="text-sm text-ardoise">
                  {stats.quantite} vendu{stats.quantite > 1 ? "s" : ""}
                </span>
                <span className="w-24 text-end font-medium text-charbon">
                  {formaterDh(stats.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
