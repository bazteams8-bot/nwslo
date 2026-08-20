export type OptionItem = {
  id: string;
  name: string;
  price_delta: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  option_items: OptionItem[];
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  category_id: string | null;
  option_groups: OptionGroup[];
};

export type ChoixPanier = {
  groupName: string;
  itemId: string;
  name: string;
  priceDelta: number;
};

export type LignePanier = {
  cle: string;
  productId: string;
  name: string;
  prixBase: number;
  choix: ChoixPanier[];
  quantite: number;
};

/**
 * Identifie une ligne par produit + options choisies.
 *
 * Deux tacos avec exactement le meme supplement doivent se regrouper en
 * « x2 » ; un tacos avec fromage et un sans restent deux lignes.
 */
export function cleLigne(productId: string, choix: ChoixPanier[]): string {
  const ids = choix.map((c) => c.itemId).sort();
  return [productId, ...ids].join("|");
}

export function prixUnitaire(ligne: LignePanier): number {
  return (
    ligne.prixBase + ligne.choix.reduce((total, c) => total + c.priceDelta, 0)
  );
}

export function totalLigne(ligne: LignePanier): number {
  return prixUnitaire(ligne) * ligne.quantite;
}

export function sousTotal(lignes: LignePanier[]): number {
  return lignes.reduce((total, l) => total + totalLigne(l), 0);
}

export function nombreArticles(lignes: LignePanier[]): number {
  return lignes.reduce((total, l) => total + l.quantite, 0);
}

export function formaterDh(montant: number): string {
  return `${montant.toFixed(2)} DH`;
}

/**
 * Dit si la selection d'un groupe est acceptable.
 * Un groupe obligatoire doit avoir au moins `min_select` choix, et
 * aucun groupe ne peut depasser `max_select`.
 */
export function selectionValide(
  groupe: OptionGroup,
  choisis: string[],
): boolean {
  if (choisis.length > groupe.max_select) return false;
  if (groupe.is_required && choisis.length < Math.max(1, groupe.min_select)) {
    return false;
  }
  return true;
}

const PREFIXE = "nwslo-panier-";

export function lirePanier(shopId: string): LignePanier[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(PREFIXE + shopId);
    return brut ? (JSON.parse(brut) as LignePanier[]) : [];
  } catch {
    // Contenu illisible (ancien format, stockage bloque) : mieux vaut
    // repartir d'un panier vide que planter la page du snack.
    return [];
  }
}

export function ecrirePanier(shopId: string, lignes: LignePanier[]): void {
  try {
    window.localStorage.setItem(PREFIXE + shopId, JSON.stringify(lignes));
  } catch {
    // Stockage plein ou refuse : le panier reste en memoire pour la
    // session, ce qui suffit pour passer commande.
  }
}
