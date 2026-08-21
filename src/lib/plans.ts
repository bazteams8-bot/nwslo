export type Plan = "essentiel" | "pro" | "illimite";

/**
 * Les formules. Le plafond n'est pas une limite technique : rien ne
 * bloque une boutique qui le depasse. Il sert a reperer le client dont
 * l'activite a change, pour lui en parler.
 */
export const PLANS: Record<
  Plan,
  { nom: string; prix: number; plafond: number | null }
> = {
  essentiel: { nom: "Essentiel", prix: 149, plafond: 150 },
  pro: { nom: "Pro", prix: 299, plafond: 500 },
  illimite: { nom: "Illimite", prix: 499, plafond: null },
};

export const DUREES = [
  { valeur: "trial15", libelle: "Essai gratuit — 15 jours", jours: 15, essai: true },
  { valeur: "trial30", libelle: "Essai gratuit — 1 mois", mois: 1, essai: true },
  { valeur: "m1", libelle: "1 mois", mois: 1, essai: false },
  { valeur: "m3", libelle: "3 mois", mois: 3, essai: false },
  { valeur: "m12", libelle: "12 mois (2 offerts)", mois: 12, essai: false },
] as const;

export type Duree = (typeof DUREES)[number]["valeur"];

/** Ajoute une duree a une date, sans toucher a celle qu'on lui passe. */
export function ajouterDuree(depart: Date, duree: Duree): Date {
  const fin = new Date(depart);
  const choix = DUREES.find((d) => d.valeur === duree);
  if (!choix) return fin;

  if ("jours" in choix) fin.setDate(fin.getDate() + choix.jours);
  else fin.setMonth(fin.getMonth() + choix.mois);

  return fin;
}

export function estEssai(duree: Duree): boolean {
  return DUREES.find((d) => d.valeur === duree)?.essai ?? false;
}

/** Etat du quota de commandes du mois en cours. */
export function etatQuota(plan: Plan, commandesDuMois: number) {
  const { plafond } = PLANS[plan];

  if (plafond === null) {
    return { libelle: `${commandesDuMois} commandes`, niveau: "ok" as const };
  }

  const part = commandesDuMois / plafond;

  return {
    libelle: `${commandesDuMois} / ${plafond} commandes`,
    // 80 % : de quoi anticiper la conversation avant le depassement.
    niveau: part > 1 ? ("depasse" as const) : part >= 0.8 ? ("proche" as const) : ("ok" as const),
    part: Math.min(part, 1),
  };
}
