import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMyShop } from "@/lib/auth";
import { formaterDh } from "@/lib/cart";

export const metadata: Metadata = { title: "Statistiques — Nwslo" };
export const dynamic = "force-dynamic";

const FUSEAU = "Africa/Casablanca";

/** Le jour du mois, vu de Casablanca et non du serveur. */
function jourLocal(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: FUSEAU }).format(
      new Date(iso),
    ),
  );
}

function debutDeMois(decalage = 0): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

function evolution(actuel: number, precedent: number) {
  if (precedent === 0) {
    return actuel > 0
      ? { texte: "premier mois", classe: "text-ardoise" }
      : { texte: "—", classe: "text-ardoise-clair" };
  }
  const pourcent = Math.round(((actuel - precedent) / precedent) * 100);
  if (pourcent === 0) return { texte: "stable", classe: "text-ardoise" };

  return {
    texte: `${pourcent > 0 ? "+" : ""}${pourcent} % vs mois dernier`,
    classe: pourcent > 0 ? "text-vert-fonce" : "text-red-600",
  };
}

export default async function StatistiquesPage() {
  const { shop, supabase } = await getMyShop();
  if (!shop) redirect("/dashboard/nouveau-magasin");

  const debutMois = debutDeMois();
  const debutMoisDernier = debutDeMois(-1);

  const { data } = await supabase
    .from("orders")
    .select(
      "id, created_at, total, status, order_items (product_name, quantity, line_total)",
    )
    .eq("shop_id", shop.id)
    .gte("created_at", debutMoisDernier.toISOString());

  const commandes = data ?? [];

  // Une commande annulee n'a rien rapporte : elle est comptee a part.
  const duMois = commandes.filter((c) => new Date(c.created_at) >= debutMois);
  const valides = duMois.filter((c) => c.status !== "cancelled");
  const annulees = duMois.length - valides.length;

  const moisDernier = commandes.filter(
    (c) =>
      new Date(c.created_at) < debutMois && c.status !== "cancelled",
  );

  const chiffre = valides.reduce((t, c) => t + Number(c.total), 0);
  const chiffrePrecedent = moisDernier.reduce((t, c) => t + Number(c.total), 0);
  const panier = valides.length ? chiffre / valides.length : 0;

  // --- Produits les plus vendus ---------------------------------------
  const parProduit = new Map<string, { quantite: number; total: number }>();

  for (const commande of valides) {
    for (const ligne of commande.order_items ?? []) {
      const actuel = parProduit.get(ligne.product_name) ?? {
        quantite: 0,
        total: 0,
      };
      actuel.quantite += ligne.quantity;
      actuel.total += Number(ligne.line_total);
      parProduit.set(ligne.product_name, actuel);
    }
  }

  const meilleurs = [...parProduit.entries()]
    .sort((a, b) => b[1].quantite - a[1].quantite)
    .slice(0, 5);

  // --- Commandes par jour ----------------------------------------------
  const joursDuMois = new Date(
    debutMois.getFullYear(),
    debutMois.getMonth() + 1,
    0,
  ).getDate();

  const parJour = Array.from({ length: joursDuMois }, () => 0);
  for (const commande of valides) parJour[jourLocal(commande.created_at) - 1]++;
  const pic = Math.max(1, ...parJour);

  const chiffres = [
    {
      label: "Commandes ce mois-ci",
      valeur: String(valides.length),
      note: evolution(valides.length, moisDernier.length),
    },
    {
      label: "Chiffre d'affaires",
      valeur: formaterDh(chiffre),
      note: evolution(chiffre, chiffrePrecedent),
    },
    {
      label: "Panier moyen",
      valeur: formaterDh(panier),
      note: { texte: `${annulees} annulee${annulees > 1 ? "s" : ""}`, classe: "text-ardoise" },
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

      <dl className="grid gap-4 sm:grid-cols-3">
        {chiffres.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-bord bg-white p-4"
          >
            <dt className="text-sm text-ardoise">{c.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-charbon">
              {c.valeur}
            </dd>
            <dd className={`mt-0.5 text-sm ${c.note.classe}`}>
              {c.note.texte}
            </dd>
          </div>
        ))}
      </dl>

      <section className="rounded-xl border border-bord bg-white p-5">
        <h2 className="mb-4 font-medium text-charbon">Commandes par jour</h2>

        {valides.length === 0 ? (
          <p className="py-6 text-center text-sm text-ardoise">
            Aucune commande ce mois-ci pour l&apos;instant.
          </p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {parJour.map((nombre, i) => (
              <div
                key={i}
                title={`${i + 1} : ${nombre} commande${nombre > 1 ? "s" : ""}`}
                className="flex-1 rounded-t bg-terracotta-pale"
                style={{ height: `${Math.max(2, (nombre / pic) * 100)}%` }}
              >
                <div
                  className="h-full w-full rounded-t bg-terracotta"
                  style={{ opacity: nombre === 0 ? 0 : 1 }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-between text-xs text-ardoise-clair">
          <span>1</span>
          <span>{joursDuMois}</span>
        </div>
      </section>

      <section className="rounded-xl border border-bord bg-white">
        <h2 className="border-b border-bord px-5 py-3 font-medium text-charbon">
          Les plus vendus
        </h2>

        {meilleurs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ardoise">
            Rien encore. Les produits apparaitront ici des la premiere
            commande.
          </p>
        ) : (
          <ol className="divide-y divide-bord">
            {meilleurs.map(([nom, stat], rang) => (
              <li
                key={nom}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span className="w-5 text-sm text-ardoise-clair">
                  {rang + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-charbon">
                  {nom}
                </span>
                <span className="text-sm text-ardoise">
                  {stat.quantite} vendu{stat.quantite > 1 ? "s" : ""}
                </span>
                <span className="w-24 text-end font-medium text-charbon">
                  {formaterDh(stat.total)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
