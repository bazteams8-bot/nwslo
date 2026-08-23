import { joursAvantFermeture } from "@/lib/plans";

/**
 * Previent le gerant avant que sa boutique ferme toute seule.
 *
 * La fermeture est appliquee par la base (migration 0013). Personne ne
 * doit la decouvrir en constatant que les commandes ont cesse : le
 * bandeau apparait une semaine avant, et reste apres.
 */
export function BandeauAbonnement({ fin }: { fin: string | null }) {
  const restant = joursAvantFermeture(fin);

  // Pas de suivi d'abonnement, ou terme encore loin : rien a dire.
  if (restant === null || restant > 7) return null;

  const ferme = restant <= 0;

  const titre = ferme
    ? "Votre boutique est hors ligne"
    : restant === 1
      ? "Votre abonnement se termine demain"
      : `Votre abonnement se termine dans ${restant} jours`;

  const detail = ferme
    ? "Vos clients ne peuvent plus ouvrir votre page ni commander. Votre menu et vos commandes sont conserves : tout revient des le renouvellement."
    : "Passe ce delai, votre page ne sera plus accessible a vos clients. Contactez-nous pour la renouveler.";

  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${
        ferme
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <span className="font-medium">{titre}</span> — {detail}
    </p>
  );
}
